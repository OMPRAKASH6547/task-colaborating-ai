import { connectDB } from "@/db/connection";
import { User, type IUser } from "@/db/models";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  generateVerificationToken,
  generateResetToken,
  getTokenExpiry,
} from "@/lib/auth/tokens";
import { Session } from "@/db/models/Session";
import type { RegisterInput } from "@/schemas";

function toPublicUser(user: IUser): Omit<IUser, "password"> {
  const { password: _password, ...publicUser } = user.toObject();
  return publicUser;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<{
    user: Omit<IUser, "password">;
    accessToken: string;
    refreshToken: string;
  }> {
    await connectDB();

    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await hashPassword(input.password);
    const verificationToken = generateVerificationToken();

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: getTokenExpiry(24),
    });

    const accessToken = await createAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await createRefreshToken({
      sub: user._id.toString(),
    });

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: getTokenExpiry(24 * 7),
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  static async login(
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{
    user: Omit<IUser, "password">;
    accessToken: string;
    refreshToken: string;
  }> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const accessToken = await createAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await createRefreshToken({
      sub: user._id.toString(),
    });

    await Session.create({
      userId: user._id,
      refreshToken,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt: getTokenExpiry(24 * 7),
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    await connectDB();

    const session = await Session.findOne({ refreshToken });
    if (!session || session.expiresAt < new Date()) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await User.findById(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await Session.deleteOne({ _id: session._id });

    const newAccessToken = await createAccessToken({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const newRefreshToken = await createRefreshToken({
      sub: user._id.toString(),
    });

    await Session.create({
      userId: user._id,
      refreshToken: newRefreshToken,
      expiresAt: getTokenExpiry(24 * 7),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async logout(refreshToken: string): Promise<void> {
    await connectDB();
    await Session.deleteOne({ refreshToken });
  }

  static async forgotPassword(email: string): Promise<string | null> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return null;

    const resetToken = generateResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = getTokenExpiry(1);
    await user.save();

    return resetToken;
  }

  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    await connectDB();

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await Session.deleteMany({ userId: user._id });
  }

  static async verifyEmail(token: string): Promise<void> {
    await connectDB();

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  static async getUserById(id: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(id);
  }
}
