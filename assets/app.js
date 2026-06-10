fetch("data/players.json")
  .then(response => response.json())
  .then(players => {

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
  .catch(error => {
    console.error("Error loading leaderboard:", error);
  });
