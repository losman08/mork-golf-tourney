console.log("STEP 5: starting data load");

fetch("data/players.json")
  .then(response => response.json())
  .then(data => {
    console.log("PLAYERS DATA LOADED:");
    console.log(data);
  })
  .catch(error => {
    console.error("FAILED TO LOAD DATA:", error);
  });
