import { useState, useEffect } from "react";
import axios from "axios";

import { apiUrl } from "../../../settings/support";

const SearchComponent = () => {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (keyword.trim() !== "") {
      axios
        .get(`${apiUrl}/people?keyword=${keyword}`)
        .then((response) => setResults(response.data))
        .catch((error) => console.error(error));
    } else {
      setResults([]);
    }
  }, [keyword]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <ul>
        {results.map((person) => (
          <li key={person.id}>{person.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default SearchComponent;
