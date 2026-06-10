fetch("data/players.json")
  .then(response => response.json())
  .then(players => {

  // STEP 7: sort players by total score (highest first)
  players.sort((a, b) => {

    const totalA =
      a.round1 + a.round2 + a.round3 + a.round4;

    const totalB =
      b.round1 + b.round2 + b.round3 + b.round4;

    return totalB - totalA;
  });

  const tbody = document.getElementById("leaderboard-body");
  tbody.innerHTML = "";

  players.forEach(player => {

    const total =
      player.round1 +
      player.round2 +
      player.round3 +
      player.round4;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${player.name}</td>
      <td>${player.round1}</td>
      <td>${player.round2}</td>
      <td>${player.round3}</td>
      <td>${player.round4}</td>
      <td><strong>${total}</strong></td>
    `;

    tbody.appendChild(row);
  });

})
