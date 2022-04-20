require('dotenv').config();
const mysql = require('mysql');
const inquier = require('inquirer');
const cTable = require('console.table');
const figlet = require('figlet');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'employee_DB',
});

// Connect to the DB
connection.connect((err) => {
  if (err) throw err;
  console.log(`connected as id ${connection.threadId}\n`);
  figlet('Employee tracker', function (err, data) {
    if (err) {
      console.log('ascii art not loaded');
    } else {
      console.log(data);
    }
    initialPrompt();
  });
});

function initialPrompt() {
  const startQuestion = [{
    type: "list",
    name: "action",
    message: "What would you like to do?",
    loop: false,
    choices: ["View all employees",
      "View all roles",
      "View all departments",
      "add an employee",
      "quit"
    ]
  }]

  inquier.prompt(startQuestion)
    .then(response => {
      switch (response.action) {
        case "View all employees":
          displayAll("EMPLOYEE");
          break;
        case "View all roles":
          displayAll("ROLE");
          break;
        case "View all departments":
          displayAll("DEPARTMENT");
          break;
        case "add an employee":
          addEmployee();
          break;
        default:
          connection.end();
      }
    })
    .catch(err => {
      console.error(err);
    });
};

const displayAll = (table) => {
  // const query = `SELECT * FROM ${table}`;
  let query;
  if (table === "DEPARTMENT") {
    query = `SELECT * FROM DEPARTMENT`;
  } else if (table === "ROLE") {
    query = `SELECT R.id AS id, title, salary, D.name AS department
    FROM ROLE AS R LEFT JOIN DEPARTMENT AS D
    ON R.department_id = D.id;`;
  } else {//employee
    query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
    R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
    FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
    LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
    LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id;`;

  }
  connection.query(query, (err, res) => {
    if (err) throw err;
    console.table(res);

    initialPrompt();
  });
};

const addEmployee = () => {
  //get all the employee list to make choice of employee's manager
  connection.query("SELECT * FROM EMPLOYEE", (err, emplRes) => {
    if (err) throw err;
    const employeeArr = [
      {
        name: 'None',
        value: 0
      }
    ]; //an employee could have no manager
    emplRes.forEach(({ first_name, last_name, id }) => {
      employeeArr.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    //get all the role list to make choice of employee's role
    connection.query("SELECT * FROM ROLE", (err, rolRes) => {
      if (err) throw err;
      const roleArr = [];
      rolRes.forEach(({ title, id }) => {
        roleArr.push({
          name: title,
          value: id
        });
      });

      let questions = [
        {
          type: "input",
          name: "first_name",
          message: "Please enter employee's first name."
        },
        {
          type: "input",
          name: "last_name",
          message: "Please enter employee's last name."
        },
        {
          type: "list",
          name: "role_id",
          choices: roleArr,
          message: "Please enter employee's role."
        },
        {
          type: "list",
          name: "manager_id",
          choices: employeeArr,
          message: "Please enter employee's manager."
        }
      ]

      inquier.prompt(questions)
        .then(response => {
          const query = `INSERT INTO EMPLOYEE (first_name, last_name, role_id, manager_id) VALUES (?)`;
          let manager_id = response.manager_id !== 0 ? response.manager_id : null;
          connection.query(query, [[response.first_name, response.last_name, response.role_id, manager_id]], (err, res) => {
            if (err) throw err;
            console.log(`employee successfully added! ${response.first_name} ${response.last_name} with id ${res.insertId}`);
            initialPrompt();
          });
        })
        .catch(err => {
          console.error(err);
        });
    })
  });
}