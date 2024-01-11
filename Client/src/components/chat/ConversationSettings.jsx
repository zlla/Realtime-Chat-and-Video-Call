import { string } from "prop-types";
import { useState } from "react";
import axios from "axios";

import { apiUrl } from "../../settings/support";

const ConversationSettings = (props) => {
  const { tempConversationId, tempConversationName } = props;

  const [isClickChangeConversationName, setIsClickChangeConversationName] =
    useState(false);
  const [newConversationName, setNewConversationName] =
    useState(tempConversationName);

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
        },
        config
      );
      setIsClickChangeConversationName(false);
    } catch (error) {
      console.log(error);
    }
  };

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
        {isClickChangeConversationName && (
          <div>
            <label htmlFor="changeConversationName"></label>
            <input
              type="text"
              id="changeConversationName"
              value={newConversationName}
              onChange={(e) => setNewConversationName(e.target.value)}
            />
            <br />
            <button onClick={() => handleChangeConversationName()}>Set</button>
            <button onClick={() => setIsClickChangeConversationName(false)}>
              Cancel
            </button>
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
};

export default ConversationSettings;
