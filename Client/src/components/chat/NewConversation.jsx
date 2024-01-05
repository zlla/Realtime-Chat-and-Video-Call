import { useState } from "react";
import axios from "axios";
import { array } from "prop-types";

import { apiUrl } from "../../settings/support";

const NewConversation = (props) => {
  const { duoConversationInfoList } = props;

  const [selectedUsernames, setSelectedUsernames] = useState([]);
  const [isClickNewConversationBtn, setIsClickNewConversationBtn] =
    useState(false);

  const handleCheckboxChange = (event) => {
    const { value } = event.target;
    const isSelected = selectedUsernames.includes(value);

    if (isSelected) {
      setSelectedUsernames((prevSelected) =>
        prevSelected.filter((username) => username !== value)
      );
    } else {
      setSelectedUsernames((prevSelected) => [...prevSelected, value]);
    }
  };

  const handleNewConversationHandle = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    const data = {
      UsernameList: selectedUsernames,
    };

    if (selectedUsernames.length > 1) {
      try {
        const response = await axios.post(
          `${apiUrl}/chatHub/newGroup`,
          data,
          config
        );
        console.log(response);
        setSelectedUsernames([]);
        setIsClickNewConversationBtn(false);
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <div>
      <button onClick={() => setIsClickNewConversationBtn(true)}>
        New Conversation
      </button>
      {isClickNewConversationBtn &&
        duoConversationInfoList &&
        duoConversationInfoList.map((item) => (
          <div key={item.username}>
            <label>
              <input
                type="checkbox"
                value={item.username}
                checked={selectedUsernames.includes(item.username)}
                onChange={handleCheckboxChange}
              />
              {item.username}
            </label>
          </div>
        ))}
      {isClickNewConversationBtn && (
        <div>
          <button onClick={handleNewConversationHandle}>Submit</button>
          <button onClick={() => setIsClickNewConversationBtn(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

NewConversation.propTypes = {
  duoConversationInfoList: array,
};

export default NewConversation;
