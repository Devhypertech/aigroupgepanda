// Re-export socket event constants
export { SOCKET_EVENTS } from './socketEvents';
// Room template enum
export var RoomTemplate;
(function (RoomTemplate) {
    RoomTemplate["TRAVEL_PLANNING"] = "TRAVEL_PLANNING";
    RoomTemplate["LIVE_TRIP"] = "LIVE_TRIP";
    RoomTemplate["FLIGHT_TRACKING"] = "FLIGHT_TRACKING";
    RoomTemplate["FOOD_DISCOVERY"] = "FOOD_DISCOVERY";
    RoomTemplate["GENERAL"] = "GENERAL";
})(RoomTemplate || (RoomTemplate = {}));
