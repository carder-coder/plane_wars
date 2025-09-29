import { Schema, model } from 'mongoose';
const userSessionSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    ipAddress: {
        type: String,
        validate: {
            validator: function (ip) {
                if (!ip)
                    return true;
                return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip) ||
                    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
            },
            message: 'IP地址格式不正确'
        }
    },
    userAgent: {
        type: String,
        maxlength: 1000
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: false,
    versionKey: false,
    toJSON: {
        transform: function (_doc, ret) {
            const transformed = { ...ret };
            delete transformed._id;
            transformed.refreshToken = undefined;
            return transformed;
        }
    }
});
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ userId: 1, createdAt: -1 });
userSessionSchema.virtual('isExpired').get(function () {
    return new Date() > this.expiresAt;
});
userSessionSchema.virtual('remainingTime').get(function () {
    const now = new Date();
    if (now > this.expiresAt) {
        return 0;
    }
    return Math.floor((this.expiresAt.getTime() - now.getTime()) / 1000);
});
userSessionSchema.methods.extend = function (additionalSeconds = 7 * 24 * 60 * 60) {
    const now = new Date();
    this.expiresAt = new Date(now.getTime() + additionalSeconds * 1000);
};
userSessionSchema.methods.deactivate = function () {
    this.isActive = false;
};
userSessionSchema.methods.isValid = function () {
    return this.isActive && !this.isExpired;
};
userSessionSchema.statics.findByRefreshToken = function (refreshToken) {
    return this.findOne({
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });
};
userSessionSchema.statics.findUserSessions = function (userId, activeOnly = true) {
    const query = { userId };
    if (activeOnly) {
        query.isActive = true;
        query.expiresAt = { $gt: new Date() };
    }
    return this.find(query).sort({ createdAt: -1 });
};
userSessionSchema.statics.deactivateUserSessions = function (userId) {
    return this.updateMany({ userId, isActive: true }, { $set: { isActive: false } });
};
userSessionSchema.statics.cleanupExpiredSessions = function () {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
        ]
    });
};
userSessionSchema.statics.createSession = function (sessionId, userId, refreshToken, expiresIn = 7 * 24 * 60 * 60, ipAddress, userAgent) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return this.create({
        sessionId,
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
        createdAt: new Date()
    });
};
userSessionSchema.statics.refreshSession = function (oldRefreshToken, newRefreshToken, expiresIn = 7 * 24 * 60 * 60) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return this.findOneAndUpdate({
        refreshToken: oldRefreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }, {
        $set: {
            refreshToken: newRefreshToken,
            expiresAt,
            createdAt: new Date()
        }
    }, { new: true });
};
userSessionSchema.pre('save', function (next) {
    if (this.isNew) {
        this.createdAt = new Date();
        if (!this.expiresAt) {
            this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
    }
    next();
});
userSessionSchema.statics.startCleanupTask = function () {
    setInterval(async () => {
        try {
            const result = await this.cleanupExpiredSessions?.();
            if (result && result.deletedCount > 0) {
                console.log(`清理了 ${result.deletedCount} 个过期会话`);
            }
        }
        catch (error) {
            console.error('清理过期会话失败:', error);
        }
    }, 60 * 60 * 1000);
};
export const UserSession = model('UserSession', userSessionSchema);
//# sourceMappingURL=UserSession.js.map