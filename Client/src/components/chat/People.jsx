import { any, array } from "prop-types";

const People = (props) => {
  const {
    duoConversationInfoList,
    setToggleConversation,
    setSignalRId,
    setIsGroup,
  } = props;

  return (
    <div>
      {duoConversationInfoList &&
        duoConversationInfoList.map((item) => (
          <div key={item.username}>
            <button
              onClick={() => {
                setToggleConversation(true);
                setSignalRId(item.username);
                setIsGroup(false);
              }}
            >
              {item.username}
            </button>
          </div>
        ))}
    </div>
  );
};

People.propTypes = {
  duoConversationInfoList: array,
  setToggleConversation: any,
  setSignalRId: any,
  setIsGroup: any,
};

export default People;
