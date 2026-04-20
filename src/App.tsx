import { useEffect } from "react";
import { startGame, destroyGame } from "./game/main";
import "./index.css";

function App() {
  useEffect(() => {
    startGame();

    return () => {
      destroyGame();
    };
  }, []);

  return (
    <div className="app">
      <div id="game-container"></div>
    </div>
  );
}

export default App;