async function loadLeaderboard() {
  const response = await fetch("../data/players.json");
  const players = await response.json();

  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  players.forEach(player => {
    const total =
      player.round1 +
      player.round2 +
      player.round3 +
      player.round4;

    const row = `
      <tr>
        <td>${player.name}</td>
        <td>${player.round1}</td>
        <td>${player.round2}</td>
        <td>${player.round3}</td>
        <td>${player.round4}</td>
        <td><strong>${total}</strong></td>
      </tr>
    `;

    tbody.innerHTML += row;
  });
}

loadLeaderboard();
