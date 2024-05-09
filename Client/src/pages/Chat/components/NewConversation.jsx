import { useState } from "react";
import axios from "axios";
import { array } from "prop-types";
import { apiUrl } from "../../../settings/support";

const NewConversation = (props) => {
  const { duoConversationInfoList } = props;

  const [selectedUsernames, setSelectedUsernames] = useState([]);

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
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <div>
      {duoConversationInfoList &&
        duoConversationInfoList.map((item) => (
          <div key={item.username} className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              value={item.username}
              checked={selectedUsernames.includes(item.username)}
              onChange={handleCheckboxChange}
            />
            <label className="form-check-label ml-2">{item.username}</label>
          </div>
        ))}
      {
        <div>
          <button
            className="btn btn-success mt-3"
            onClick={handleNewConversationHandle}
          >
            Submit
          </button>
        </div>
      }
    </div>
  );
};

NewConversation.propTypes = {
  duoConversationInfoList: array,
};

export default NewConversation;
