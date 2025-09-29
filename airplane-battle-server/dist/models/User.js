import { Schema, model } from 'mongoose';
const userSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 100,
        index: true,
        validate: {
            validator: function (email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: '邮箱格式不正确'
        }
    },
    passwordHash: {
        type: String,
        minlength: 60
    },
    displayName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    avatarUrl: {
        type: String,
        maxlength: 500,
        validate: {
            validator: function (url) {
                if (!url)
                    return true;
                return /^https?:\/\/.+/.test(url);
            },
            message: '头像URL格式不正确'
        }
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 100
    },
    experience: {
        type: Number,
        default: 0,
        min: 0
    },
    wins: {
        type: Number,
        default: 0,
        min: 0
    },
    losses: {
        type: Number,
        default: 0,
        min: 0
    },
    rating: {
        type: Number,
        default: 1000,
        min: 0,
        max: 3000
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
    lastLogin: {
        type: Date,
        index: true
    }
}, {
    timestamps: false,
    versionKey: false,
    toJSON: {
        transform: function (_doc, ret) {
            delete ret._id;
            ret.passwordHash = undefined;
            return ret;
        }
    }
});
userSchema.index({ rating: -1, createdAt: -1 });
userSchema.index({ isActive: 1, lastLogin: -1 });
userSchema.virtual('winRate').get(function () {
    const totalGames = this.wins + this.losses;
    return totalGames > 0 ? (this.wins / totalGames) * 100 : 0;
});
userSchema.methods.updateStats = function (isWin, experienceGain = 10) {
    if (isWin) {
        this.wins += 1;
        this.rating += Math.max(5, Math.floor(experienceGain / 2));
    }
    else {
        this.losses += 1;
        this.rating = Math.max(800, this.rating - Math.max(3, Math.floor(experienceGain / 3)));
    }
    this.experience += experienceGain;
    const nextLevelExp = this.level * 100;
    if (this.experience >= nextLevelExp) {
        this.level += 1;
        this.experience -= nextLevelExp;
    }
};
userSchema.statics.findByUsername = function (username) {
    return this.findOne({ username, isActive: true });
};
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email, isActive: true });
};
userSchema.statics.getLeaderboard = function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ rating: -1, wins: -1 })
        .limit(limit)
        .select('userId username displayName level rating wins losses');
};
userSchema.pre('save', function (next) {
    if (this.isNew) {
        this.createdAt = new Date();
    }
    next();
});
export const User = model('User', userSchema);
//# sourceMappingURL=User.js.map