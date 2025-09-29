import { Schema, model } from 'mongoose';
const roomMemberSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    playerNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 2
    },
    isReady: {
        type: Boolean,
        default: false
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const roomSchema = new Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    roomName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    roomType: {
        type: String,
        required: true,
        enum: ['public', 'private'],
        default: 'public',
        index: true
    },
    password: {
        type: String,
        maxlength: 50,
        validate: {
            validator: function (password) {
                if (this.roomType === 'private') {
                    return !!(password && password.length > 0);
                }
                return true;
            },
            message: '私人房间必须设置密码'
        }
    },
    maxPlayers: {
        type: Number,
        required: true,
        default: 2,
        min: 2,
        max: 4
    },
    currentPlayers: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: function (current) {
                return current <= this.maxPlayers;
            },
            message: '当前玩家数不能超过最大玩家数'
        }
    },
    status: {
        type: String,
        required: true,
        enum: ['waiting', 'playing', 'finished'],
        default: 'waiting',
        index: true
    },
    hostUserId: {
        type: String,
        required: true,
        index: true
    },
    members: [roomMemberSchema],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    versionKey: false,
    toJSON: {
        transform: function (_doc, ret) {
            delete ret._id;
            return ret;
        }
    }
});
roomSchema.index({ status: 1, createdAt: -1 });
roomSchema.index({ roomType: 1, status: 1 });
roomSchema.index({ 'members.userId': 1 });
roomSchema.virtual('needPassword').get(function () {
    return this.roomType === 'private' && !!this.password;
});
roomSchema.virtual('isFull').get(function () {
    return this.currentPlayers >= this.maxPlayers;
});
roomSchema.virtual('isEmpty').get(function () {
    return this.currentPlayers === 0;
});
roomSchema.methods.addMember = function (userId) {
    if (this.currentPlayers >= this.maxPlayers) {
        return false;
    }
    const existingMember = this.members.find((member) => member.userId === userId);
    if (existingMember) {
        return false;
    }
    const playerNumber = this.currentPlayers + 1;
    this.members.push({
        userId,
        playerNumber,
        isReady: false,
        joinedAt: new Date()
    });
    this.currentPlayers += 1;
    this.updatedAt = new Date();
    return true;
};
roomSchema.methods.removeMember = function (userId) {
    const memberIndex = this.members.findIndex((member) => member.userId === userId);
    if (memberIndex === -1) {
        return false;
    }
    this.members.splice(memberIndex, 1);
    this.currentPlayers -= 1;
    this.updatedAt = new Date();
    if (this.hostUserId === userId && this.members.length > 0) {
        const newHost = this.members.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
        this.hostUserId = newHost.userId;
    }
    if (this.currentPlayers === 0) {
        this.status = 'finished';
    }
    return true;
};
roomSchema.methods.setMemberReady = function (userId, isReady) {
    const member = this.members.find((member) => member.userId === userId);
    if (!member) {
        return false;
    }
    member.isReady = isReady;
    this.updatedAt = new Date();
    return true;
};
roomSchema.methods.areAllMembersReady = function () {
    return this.members.length === this.maxPlayers &&
        this.members.every((member) => member.isReady);
};
roomSchema.methods.startGame = function () {
    if (!this.areAllMembersReady()) {
        return false;
    }
    this.status = 'playing';
    this.updatedAt = new Date();
    return true;
};
roomSchema.statics.findWaitingRooms = function (page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find({ status: 'waiting' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};
roomSchema.statics.findUserRooms = function (userId) {
    return this.find({
        $or: [
            { hostUserId: userId },
            { 'members.userId': userId }
        ],
        status: { $ne: 'finished' }
    });
};
roomSchema.statics.findByRoomId = function (roomId) {
    return this.findOne({ roomId });
};
roomSchema.pre('save', function (next) {
    if (this.isNew) {
        this.createdAt = new Date();
    }
    this.updatedAt = new Date();
    next();
});
roomSchema.pre('save', function (next) {
    if (this.members.length !== this.currentPlayers) {
        this.currentPlayers = this.members.length;
    }
    next();
});
export const Room = model('Room', roomSchema);
//# sourceMappingURL=Room.js.map