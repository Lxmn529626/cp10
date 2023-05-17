const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server running at http://localhost:3000")
    );
  } catch (error) {
    console.log(`DB ERROR : '${error.message}'`);
    process.exit(1);
  }
};
initializeDbAndServer();
const convertStatetoObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistricttoObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
function authenticateToken(request, response, next) {
  let jwtToken;
  const authencateHeader = request.header["authentication"];
  if (authencateHeader !== undefined) {
    jwtToken = authencateHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT token");
  } else {
    jwt.verify(jwtToken, "Laxman", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid Jwt Token");
      } else {
        next();
      }
    });
  }
}
app.post("/login/", async (request, response) => {
  const { uername, password } = request.body;
  const selectUser = `select * from user where username='${username}';`;
  const databaseUser = await db.get(selectUser);
  if (databaseUser === undefined) {
    response.status(401);
    response.send("Invalid User");
  } else {
    const isequalpasswords = await bcrypt.compare(password, dbUser.password);
    if (isequalpasswords === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "Laxman");
      response.send(jwtToken);
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
app.get("/states", authenticateToken, async (request, response) => {
  const getallstates = `select * from state;`;
  const statesArray = await db.all(getallstates);
  response.send(
    statesArray.map((eachState) => convertStatetoObject(eachState))
  );
});
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const getSingle = `select * from state where state_id='${stateId};`;
  const states = await db.get(getSingle);
  response.send(convertStatetoObject(states));
});
app.post("/districts/", authenticateToken, async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const postnewdist = `insert into district(state_id,district_name,cases,cured,active,deaths) 
    values('${stateId}','${districtName}','${cases}','${cured}','${active}','${deaths}');`;
  await db.run(postnewdist);
  response.send("District successfully Added");
});
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictsQuery = `select * from district where district_id=${districtId};`;
    const singleDist = await db.get(getDistrictsQuery);
    response.send(convertDistricttoObject(singleDist));
  }
);

//app.get()
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const delDist = `delete from district where district_id=${districtId};`;
    await db.run(delDist);
    response.send("District Removed");
  }
);
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrict = `update district set district_name='${districtName}', state_id='${stateId}', cases='${cases}', cured='${cured}', active='${active}', deaths='${deaths}' where district_id='${districtId};`;
    await db.run(updateDistrict);
    response.send("District Details Updated");
  }
);
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStats = `select sum(cases), sum(cured),sum(active),sum(deaths) from district where state_id=${stateId};`;
    const finalStats = await db.get(getStateStats);
    response.send({
      totalCases: finalStats["sum(cases)"],
      totalCured: finalStats["sum(cured)"],
      totalActive: finalStats["sum(active)"],
      totalDeaths: finalStats["sum(deaths)"],
    });
  }
);
module.exports = app;
