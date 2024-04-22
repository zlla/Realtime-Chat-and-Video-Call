import { bool, string } from "prop-types";
import { useEffect, useState } from "react";
import axios from "axios";

import { apiUrl } from "../../settings/support";

const ConversationSettings = (props) => {
  const { tempConversationId, tempConversationName, myNickname, isGroup } =
    props;

  const [isClickChangeConversationName, setIsClickChangeConversationName] =
    useState(false);
  const [newConversationName, setNewConversationName] = useState("");
  const [isChangeSelfNickname, setIsChangeSelfNickname] = useState(false);

  const handleChangeConversationName = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };
    const Id = Number(tempConversationId);

    try {
      await axios.patch(
        `${apiUrl}/conversation/changeConversationName`,
        {
          Id,
          NewConversationName: newConversationName,
          IsChangeSelfNickname: isChangeSelfNickname,
        },
        config
      );
      setIsClickChangeConversationName(false);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setNewConversationName(tempConversationName);
  }, [tempConversationId, tempConversationName]);

  return (
    <div>
      <div>
        <button
          type="button"
          onClick={() => {
            setNewConversationName(tempConversationName);
            setIsClickChangeConversationName(true);
          }}
        >
          Change conversation name
        </button>
        <br />
        {isClickChangeConversationName && !isGroup && (
          <div>
            <select
              value={isChangeSelfNickname}
              onChange={(e) => {
                setIsChangeSelfNickname(e.target.value === "true");
                if (e.target.value === "true") {
                  setNewConversationName(myNickname);
                } else {
                  setNewConversationName(tempConversationName);
                }
              }}
            >
              <option value={true}>Your Nickname</option>
              <option value={false}>Your Friend Nickname</option>
            </select>
            <div>
              <label htmlFor="changeConversationName">Nickname</label>
              <input
                type="text"
                id="changeConversationName"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
              />
              <br />
              <button
                onClick={() => {
                  handleChangeConversationName();
                }}
              >
                Set
              </button>
              <button onClick={() => setIsClickChangeConversationName(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {isClickChangeConversationName && isGroup && (
          <div>
            <div>
              <label htmlFor="changeConversationName">
                Change Conversation Name
              </label>
              <input
                type="text"
                id="changeConversationName"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
              />
              <br />
              <button onClick={() => handleChangeConversationName()}>
                Set
              </button>
              <button onClick={() => setIsClickChangeConversationName(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <button type="button">Change avatar</button>
        <br />
        <button type="button">Change theme</button>
        <br />
        <button type="button">Change icon</button>
        <br />
      </div>
    </div>
  );
};

ConversationSettings.propTypes = {
  tempConversationId: string,
  tempConversationName: string,
  myNickname: string,
  isGroup: bool,
};

export default ConversationSettings;
