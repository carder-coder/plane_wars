import { Schema, model } from 'mongoose';
const coordinateSchema = new Schema({
    x: {
        type: Number,
        required: true,
        min: 0,
        max: 9
    },
    y: {
        type: Number,
        required: true,
        min: 0,
        max: 9
    }
}, { _id: false });
const airplanePositionSchema = new Schema({
    head: {
        type: coordinateSchema,
        required: true
    },
    body: {
        type: [coordinateSchema],
        required: true,
        validate: {
            validator: function (body) {
                return body.length === 2;
            },
            message: '飞机身体必须包含2个坐标'
        }
    },
    wings: {
        type: [coordinateSchema],
        required: true,
        validate: {
            validator: function (wings) {
                return wings.length === 2;
            },
            message: '飞机翅膀必须包含2个坐标'
        }
    },
    tail: {
        type: [coordinateSchema],
        required: true,
        validate: {
            validator: function (tail) {
                return tail.length === 1;
            },
            message: '飞机尾巴必须包含1个坐标'
        }
    },
    orientation: {
        type: String,
        required: true,
        enum: ['horizontal', 'vertical']
    },
    isPlaced: {
        type: Boolean,
        default: false
    }
}, { _id: false });
const attackRecordSchema = new Schema({
    coordinate: {
        type: coordinateSchema,
        required: true
    },
    result: {
        type: String,
        required: true,
        enum: ['hit_head', 'hit_body', 'miss']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    attackerId: {
        type: String,
        required: true
    }
}, { _id: false });
const gameSchema = new Schema({
    gameId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    roomId: {
        type: String,
        required: true,
        index: true
    },
    player1Id: {
        type: String,
        required: true,
        index: true
    },
    player2Id: {
        type: String,
        required: true,
        index: true
    },
    winnerId: {
        type: String,
        index: true
    },
    currentPhase: {
        type: String,
        required: true,
        enum: ['waiting', 'placement', 'battle', 'finished'],
        default: 'waiting',
        index: true
    },
    currentPlayer: {
        type: Number,
        min: 1,
        max: 2,
        validate: {
            validator: function (player) {
                if (this.currentPhase === 'battle') {
                    return player === 1 || player === 2;
                }
                return true;
            },
            message: '战斗阶段必须指定当前玩家'
        }
    },
    turnCount: {
        type: Number,
        default: 0,
        min: 0
    },
    gameDuration: {
        type: Number,
        min: 0
    },
    player1Airplane: airplanePositionSchema,
    player2Airplane: airplanePositionSchema,
    attackHistory: [attackRecordSchema],
    startedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    finishedAt: {
        type: Date,
        index: true
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
gameSchema.index({ player1Id: 1, startedAt: -1 });
gameSchema.index({ player2Id: 1, startedAt: -1 });
gameSchema.index({ winnerId: 1, finishedAt: -1 });
gameSchema.index({ currentPhase: 1, startedAt: -1 });
gameSchema.virtual('isFinished').get(function () {
    return this.currentPhase === 'finished';
});
gameSchema.virtual('isInProgress').get(function () {
    return this.currentPhase === 'battle';
});
gameSchema.virtual('bothPlayersPlaced').get(function () {
    return this.player1Airplane?.isPlaced && this.player2Airplane?.isPlaced;
});
gameSchema.methods.placePlane = function (playerId, airplane) {
    if (this.currentPhase !== 'placement') {
        return false;
    }
    if (!this.validateAirplanePosition(airplane)) {
        return false;
    }
    if (playerId === this.player1Id) {
        this.player1Airplane = { ...airplane, isPlaced: true };
    }
    else if (playerId === this.player2Id) {
        this.player2Airplane = { ...airplane, isPlaced: true };
    }
    else {
        return false;
    }
    if (this.bothPlayersPlaced) {
        this.currentPhase = 'battle';
        this.currentPlayer = 1;
        this.startedAt = new Date();
    }
    return true;
};
gameSchema.methods.attack = function (attackerId, coordinate) {
    if (this.currentPhase !== 'battle') {
        return null;
    }
    const isPlayer1Turn = this.currentPlayer === 1;
    const isValidAttacker = (isPlayer1Turn && attackerId === this.player1Id) ||
        (!isPlayer1Turn && attackerId === this.player2Id);
    if (!isValidAttacker) {
        return null;
    }
    const alreadyAttacked = this.attackHistory.some((attack) => attack.coordinate.x === coordinate.x && attack.coordinate.y === coordinate.y);
    if (alreadyAttacked) {
        return null;
    }
    const targetAirplane = isPlayer1Turn ? this.player2Airplane : this.player1Airplane;
    if (!targetAirplane) {
        return null;
    }
    let result = 'miss';
    if (this.coordinateEquals(coordinate, targetAirplane.head)) {
        result = 'hit_head';
    }
    else if (this.coordinateInArray(coordinate, targetAirplane.body) ||
        this.coordinateInArray(coordinate, targetAirplane.wings) ||
        this.coordinateInArray(coordinate, targetAirplane.tail)) {
        result = 'hit_body';
    }
    this.attackHistory.push({
        coordinate,
        result,
        timestamp: new Date(),
        attackerId
    });
    this.turnCount += 1;
    if (result === 'hit_head') {
        this.currentPhase = 'finished';
        this.winnerId = attackerId;
        this.finishedAt = new Date();
        this.gameDuration = Math.floor((this.finishedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    else {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
    return result;
};
gameSchema.methods.validateAirplanePosition = function (airplane) {
    const allCoordinates = [
        airplane.head,
        ...airplane.body,
        ...airplane.wings,
        ...airplane.tail
    ];
    for (const coord of allCoordinates) {
        if (coord.x < 0 || coord.x > 9 || coord.y < 0 || coord.y > 9) {
            return false;
        }
    }
    const coordStrings = allCoordinates.map(coord => `${coord.x},${coord.y}`);
    const uniqueCoords = new Set(coordStrings);
    if (uniqueCoords.size !== allCoordinates.length) {
        return false;
    }
    return true;
};
gameSchema.methods.coordinateEquals = function (coord1, coord2) {
    return coord1.x === coord2.x && coord1.y === coord2.y;
};
gameSchema.methods.coordinateInArray = function (coordinate, coordinates) {
    return coordinates.some(coord => this.coordinateEquals(coordinate, coord));
};
gameSchema.statics.findPlayerGames = function (playerId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find({
        $or: [
            { player1Id: playerId },
            { player2Id: playerId }
        ]
    })
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit);
};
gameSchema.statics.findActiveGames = function () {
    return this.find({
        currentPhase: { $in: ['placement', 'battle'] }
    });
};
gameSchema.statics.getPlayerStats = function (playerId) {
    return this.aggregate([
        {
            $match: {
                $or: [
                    { player1Id: playerId },
                    { player2Id: playerId }
                ],
                currentPhase: 'finished'
            }
        },
        {
            $group: {
                _id: null,
                totalGames: { $sum: 1 },
                wins: {
                    $sum: {
                        $cond: [{ $eq: ['$winnerId', playerId] }, 1, 0]
                    }
                },
                averageDuration: { $avg: '$gameDuration' },
                averageTurns: { $avg: '$turnCount' }
            }
        }
    ]);
};
gameSchema.pre('save', function (next) {
    if (this.isNew) {
        this.startedAt = new Date();
    }
    next();
});
export const Game = model('Game', gameSchema);
//# sourceMappingURL=Game.js.map