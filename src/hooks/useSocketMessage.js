import { useState } from "react";

const useSocket = (socket) => {
  console.log("socket", socket);
  const [currProductKey, setCurrProductKey] = useState();
  const [chapterList, setChapterList] = useState();
  const [currPlayMode, setCurrPlayMode] = useState();
  const [currActId, setCurrActId] = useState();
  const [currItemId, setCurrItemId] = useState();
  const [currVariant, setCurrVariant] = useState();
  const [playPause, setPlayPause] = useState();
  const [playPauseToggle, setPlayPauseToggle] = useState(false);
  const [interactionId, SetInteractionId] = useState();
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);

  socket.on("message", (data) => {
    console.log("smessage", data);
    switch (data.message.type) {
      case "curr_product_key":
        setCurrProductKey(data.message.message);
        break;
      case "curr_chapter_list":
        setChapterList(data.message.message);
        break;
      case "curr_player_mode":
        setCurrPlayMode(data.message.message);
        break;
      case "curr_act_id":
        setCurrActId(data.message.message);
        break;
      case "curr_item_id":
        setCurrItemId(data.message.message);
        break;
      case "change_variant":
        setCurrVariant(data.message.message);
        break;
      case "canvas_play_pause":
        setPlayPause(data.message.message);
        setPlayPauseToggle((prev) => !prev);
        break;
      case "interaction_id":
        SetInteractionId(data.message.message);
        break;
      case "is_loaded":
        setIsLoadingScreen(data.message.message);
        break;
    }
  });

  socket.on("curr_play_mode", (data) => {
    setCurrPlayMode(data.curr_play_mode);
  });

  return {
    currProductKey,
    chapterList,
    currPlayMode,
    currActId,
    currItemId,
    currVariant,
    playPause,
    playPauseToggle,
    interactionId,
    isLoadingScreen,
  };
};

export default useSocket;
