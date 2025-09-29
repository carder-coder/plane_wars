export var MessageType;
(function (MessageType) {
    MessageType["JOIN_ROOM"] = "JOIN_ROOM";
    MessageType["LEAVE_ROOM"] = "LEAVE_ROOM";
    MessageType["ROOM_JOINED"] = "ROOM_JOINED";
    MessageType["ROOM_LEFT"] = "ROOM_LEFT";
    MessageType["PLAYER_JOINED"] = "PLAYER_JOINED";
    MessageType["PLAYER_LEFT"] = "PLAYER_LEFT";
    MessageType["ROOM_UPDATED"] = "ROOM_UPDATED";
    MessageType["ROOM_DISSOLVED"] = "ROOM_DISSOLVED";
    MessageType["PLAYER_KICKED"] = "PLAYER_KICKED";
    MessageType["HOST_TRANSFERRED"] = "HOST_TRANSFERRED";
    MessageType["PLAYER_READY"] = "PLAYER_READY";
    MessageType["GAME_START"] = "GAME_START";
    MessageType["GAME_END"] = "GAME_END";
    MessageType["PLACE_AIRPLANE"] = "PLACE_AIRPLANE";
    MessageType["AIRPLANE_PLACED"] = "AIRPLANE_PLACED";
    MessageType["CONFIRM_PLACEMENT"] = "CONFIRM_PLACEMENT";
    MessageType["PLACEMENT_CONFIRMED"] = "PLACEMENT_CONFIRMED";
    MessageType["ATTACK"] = "ATTACK";
    MessageType["ATTACK_RESULT"] = "ATTACK_RESULT";
    MessageType["TURN_CHANGE"] = "TURN_CHANGE";
    MessageType["ERROR"] = "ERROR";
    MessageType["HEARTBEAT"] = "HEARTBEAT";
    MessageType["DISCONNECT"] = "DISCONNECT";
    MessageType["RECONNECT"] = "RECONNECT";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=socket.js.map