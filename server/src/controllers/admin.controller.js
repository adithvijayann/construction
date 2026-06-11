import { Client } from "../models/Client.js";
import { Contractor } from "../models/Contractor.js";
import { Expense } from "../models/Expense.js";
import { Project } from "../models/Project.js";
import { Supervisor } from "../models/Supervisor.js";
import { User } from "../models/User.js";
import { writeAudit } from "../services/audit.service.js";
import { sendContractorCredentialsEmail, sendMailInBackground } from "../services/email.js";
import { createUserWithTemporaryPassword } from "../services/user.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { randomPassword } from "../utils/tokens.js";

const backgroundAudit = (payload) => {
  writeAudit(payload).catch((error) => {
    console.error("Audit write failed", { action: payload.action, entityId: payload.entityId, reason: error.message });
  });
};

const contractorResponse = (contractor, user) => ({
  ...contractor.toJSON(),
  user: user.toJSON()
});

export const adminOverview = asyncHandler(async (_req, res) => {
  const [users, contractors, clients, supervisors, projects, expenses] = await Promise.all([
    User.countDocuments(),
    Contractor.countDocuments({ isActive: true }),
    Client.countDocuments({ isActive: true }),
    Supervisor.countDocuments({ isActive: true }),
    Project.countDocuments(),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
  ]);

  res.json({
    overview: {
      users,
      contractors,
      clients,
      supervisors,
      projects,
      expenses: expenses[0]?.total || 0
    }
  });
});

export const listContractors = asyncHandler(async (_req, res) => {
  const contractors = await Contractor.find().populate("user", "name email role status createdAt").sort({ createdAt: -1 });
  res.json({ contractors });
});

export const createContractor = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  let temporaryPassword = null;
  let reusedUser = false;

  if (user) {
    if (user.role !== "contractor") {
      throw new ApiError(409, "That email belongs to a non-contractor account");
    }
    reusedUser = true;
    temporaryPassword = randomPassword();
    user.name = req.body.name;
    await user.setPassword(temporaryPassword);
    if (user.status !== "active") {
      user.status = "active";
    }
    await user.save();
  } else {
    const created = await createUserWithTemporaryPassword({
      name: req.body.name,
      email: normalizedEmail,
      role: "contractor"
    });
    user = created.user;
    temporaryPassword = created.temporaryPassword;
  }

  const contractor = await Contractor.create({
    user: user._id,
    companyName: req.body.companyName,
    phone: req.body.phone || "",
    address: req.body.address || ""
  });

  const email = sendMailInBackground({
    to: user.email,
    subject: "Construction log contractor account",
    label: "Contractor credential email",
    send: () =>
      sendContractorCredentialsEmail({
        name: user.name,
        email: user.email,
        temporaryPassword,
        loginUrl: req.body.loginUrl || req.get("origin") || ""
      })
  });

  backgroundAudit({
    actor: req.user._id,
    action: "contractor.created",
    entityType: "Contractor",
    entityId: contractor._id,
    metadata: { email: user.email, emailSending: email.sending || false, reusedUser }
  });

  res.status(201).json({
    contractor: contractorResponse(contractor, user),
    email,
    reusedUser,
    temporaryPassword
  });
});

export const updateContractor = asyncHandler(async (req, res) => {
  const contractor = await Contractor.findById(req.params.contractorId);
  if (!contractor) return res.status(404).json({ message: "Contractor not found" });

  const currentUser = await User.findById(contractor.user);
  if (!currentUser) throw new ApiError(404, "Contractor user account not found");

  let email = null;

  if (req.body.email) {
    const normalizedEmail = req.body.email.toLowerCase();
    const isEmailChanged = normalizedEmail !== currentUser.email;

    if (isEmailChanged) {
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        if (existingUser.role !== "contractor") {
          throw new ApiError(409, "That email belongs to a non-contractor account");
        }
        contractor.user = existingUser._id;
        if (req.body.name) existingUser.name = req.body.name;
        if (req.body.isActive !== false) existingUser.status = "active";
        await existingUser.save();
      } else {
        const sharedLoginCount = await Contractor.countDocuments({ user: currentUser._id });

        if (sharedLoginCount > 1) {
          const created = await createUserWithTemporaryPassword({
            name: req.body.name || currentUser.name,
            email: normalizedEmail,
            role: "contractor"
          });
          contractor.user = created.user._id;
          email = sendMailInBackground({
            to: created.user.email,
            subject: "Construction log contractor account",
            label: "Contractor credential email",
            send: () =>
              sendContractorCredentialsEmail({
                name: created.user.name,
                email: created.user.email,
                temporaryPassword: created.temporaryPassword,
                loginUrl: req.body.loginUrl || req.get("origin") || ""
              })
          });
        } else {
          currentUser.email = normalizedEmail;
        }
      }
    }
  }

  const accountUser = contractor.user.toString() === currentUser._id.toString() ? currentUser : await User.findById(contractor.user);
  if (req.body.name && accountUser) accountUser.name = req.body.name;
  if (req.body.isActive === true && accountUser) accountUser.status = "active";

  if (req.body.companyName !== undefined) contractor.companyName = req.body.companyName;
  if (req.body.phone !== undefined) contractor.phone = req.body.phone;
  if (req.body.address !== undefined) contractor.address = req.body.address;
  if (req.body.isActive !== undefined) contractor.isActive = req.body.isActive;

  await contractor.save();
  if (accountUser) await accountUser.save();

  if (req.body.isActive === false && accountUser) {
    const activeContractorsForUser = await Contractor.countDocuments({
      user: accountUser._id,
      isActive: true
    });
    if (activeContractorsForUser === 0) {
      accountUser.status = "inactive";
      await accountUser.save();
    }
  }

  await writeAudit({
    actor: req.user._id,
    action: "contractor.updated",
    entityType: "Contractor",
    entityId: contractor._id,
    metadata: { emailSending: email?.sending || false, emailSent: email?.sent || false }
  });

  res.json({
    contractor: await contractor.populate("user", "name email role status"),
    email
  });
});

export const deactivateContractor = asyncHandler(async (req, res) => {
  const contractor = await Contractor.findById(req.params.contractorId).populate("user");
  if (!contractor) return res.status(404).json({ message: "Contractor not found" });

  contractor.isActive = false;
  await contractor.save();

  const activeContractorsForUser = await Contractor.countDocuments({
    user: contractor.user._id,
    isActive: true
  });
  if (activeContractorsForUser === 0) {
    contractor.user.status = "inactive";
    await contractor.user.save();
  }

  await writeAudit({
    actor: req.user._id,
    action: "contractor.deactivated",
    entityType: "Contractor",
    entityId: contractor._id
  });

  res.json({ contractor });
});

export const deleteContractor = asyncHandler(async (req, res) => {
  const contractor = await Contractor.findById(req.params.contractorId).populate("user");
  if (!contractor) return res.status(404).json({ message: "Contractor not found" });

  const userId = contractor.user?._id;
  await Contractor.deleteOne({ _id: contractor._id });

  if (userId) {
    const remainingContractors = await Contractor.countDocuments({ user: userId });
    if (remainingContractors === 0) {
      await User.findByIdAndUpdate(userId, { status: "inactive", tokenVersion: (contractor.user.tokenVersion || 0) + 1 });
    }
  }

  await writeAudit({
    actor: req.user._id,
    action: "contractor.deleted",
    entityType: "Contractor",
    entityId: contractor._id
  });

  res.status(204).send();
});

export const adminReports = asyncHandler(async (_req, res) => {
  const [projects, clients, supervisors, expenses] = await Promise.all([
    Project.find().populate("contractor client supervisor", "name email").sort({ createdAt: -1 }),
    Client.find().populate("user contractor", "name email").sort({ createdAt: -1 }),
    Supervisor.find().populate("user contractor", "name email").sort({ createdAt: -1 }),
    Expense.find().populate("project contractor", "name email").sort({ expenseDate: -1 }).limit(100)
  ]);

  res.json({ projects, clients, supervisors, expenses });
});
