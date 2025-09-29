export var CellType;
(function (CellType) {
    CellType["EMPTY"] = "empty";
    CellType["HEAD"] = "head";
    CellType["BODY"] = "body";
    CellType["WINGS"] = "wings";
    CellType["TAIL"] = "tail";
    CellType["HIT"] = "hit";
    CellType["MISS"] = "miss";
})(CellType || (CellType = {}));
export var Orientation;
(function (Orientation) {
    Orientation["HORIZONTAL"] = "horizontal";
    Orientation["VERTICAL"] = "vertical";
})(Orientation || (Orientation = {}));
export var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "waiting";
    GamePhase["PLACEMENT"] = "placement";
    GamePhase["BATTLE"] = "battle";
    GamePhase["FINISHED"] = "finished";
})(GamePhase || (GamePhase = {}));
export var RoomType;
(function (RoomType) {
    RoomType["PUBLIC"] = "public";
    RoomType["PRIVATE"] = "private";
})(RoomType || (RoomType = {}));
export var RoomStatus;
(function (RoomStatus) {
    RoomStatus["WAITING"] = "waiting";
    RoomStatus["PLAYING"] = "playing";
    RoomStatus["FINISHED"] = "finished";
})(RoomStatus || (RoomStatus = {}));
//# sourceMappingURL=game.js.map