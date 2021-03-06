require('dotenv').config();
const mysql = require('mysql2');
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
    type: "rawlist",
    name: "action",
    message: "What would you like to do?",
    choices: ["View all employees",
      "view employees by manager",
      "view employees by department",
      "View all roles",
      "View all departments",
      "add an employee",
      "add a role",
      "add a department",
      "update role for an employee",
      "update employee's manager",
      "delete an employee",
      "delete a role",
      "delete a department",
      "View the total utilized budget of a department",
      "quit"
    ]
  }]

  inquier.prompt(startQuestion)
    .then(response => {
      switch (response.action) {
        case "View all employees":
          displayAll("EMPLOYEE");
          break;
        case "view employees by manager":
          viewByManager();
          break;
        case "view employees by department":
          viewByDepartment();
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
        case "add a role":
          addRole();
          break;
        case "add a department":
          addDepartment();
          break;
        case "update role for an employee":
          updateRole();
          break;
        case "update employee's manager":
          updateEmployeeManager();
          break;
        case "delete an employee":
          deleteEmployee();
          break;
        case "delete a role":
          deleteRole();
          break;
        case "delete a department":
          deleteDepartment();
          break;
        case "View the total utilized budget of a department":
          viewDepartmentBudget();
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
          type: "rawlist",
          name: "role_id",
          choices: roleArr,
          message: "Please select employee's role."
        },
        {
          type: "rawlist",
          name: "manager_id",
          choices: employeeArr,
          message: "Please select employee's manager."
        }
      ]

      inquier.prompt(questions)
        .then(response => {
          const query = `INSERT INTO EMPLOYEE (first_name, last_name, role_id, manager_id) VALUES (?)`;
          let manager_id = response.manager_id !== 0 ? response.manager_id : null;
          connection.query(query, [[response.first_name, response.last_name, response.role_id, manager_id]], (err, res) => {
            if (err) throw err;
            console.log(`${response.first_name} ${response.last_name} successfully added at id ${res.insertId}!`);
            initialPrompt();
          });
        })
        .catch(err => {
          console.error(err);
        });
    })
  });
};

const addRole = () => {
  //get the list of all department with department_id to make the choices object list for prompt question
  const departments = [];
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    res.forEach(dep => {
      let qObj = {
        name: dep.name,
        value: dep.id
      }
      departments.push(qObj);
    });

    //question list to get arguments for making new roles
    let questions = [
      {
        type: "input",
        name: "title",
        message: "Please enter role title."
      },
      {
        type: "input",
        name: "salary",
        message: "Please enter role salary."
      },
      {
        type: "rawlist",
        name: "department",
        choices: departments,
        message: "Please select role departmet."
      }
    ];

    inquier.prompt(questions)
      .then(response => {
        const query = `INSERT INTO ROLE (title, salary, department_id) VALUES (?)`;
        connection.query(query, [[response.title, response.salary, response.department]], (err, res) => {
          if (err) throw err;
          console.log(`${response.title} successfully added at id ${res.insertId}!`);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
};

const addDepartment = () => {
  let questions = [
    {
      type: "input",
      name: "name",
      message: "Please enter department name."
    }
  ];

  inquier.prompt(questions)
    .then(response => {
      const query = `INSERT INTO department (name) VALUES (?)`;
      connection.query(query, [response.name], (err, res) => {
        if (err) throw err;
        console.log(`${response.name} successfully added at id ${res.insertId}!`);
        initialPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
};

const updateRole = () => {
  //get all the employee list 
  connection.query("SELECT * FROM EMPLOYEE ORDER BY last_name", (err, emplRes) => {
    if (err) throw err;
    const employeeArr = [];
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
          type: "list",
          name: "id",
          choices: employeeArr,
          message: "Which employee would you like to update?"
        },
        {
          type: "rawlist",
          name: "role_id",
          choices: roleArr,
          message: "Please select employee's new role."
        }
      ]

      inquier.prompt(questions)
        .then(response => {
          const query = `UPDATE EMPLOYEE SET ? WHERE ?? = ?;`;
          connection.query(query, [
            { role_id: response.role_id },
            "id",
            response.id
          ], (err, res) => {
            if (err) throw err;

            console.log("Employee's role successfully updated!");
            initialPrompt();
          });
        })
        .catch(err => {
          console.error(err);
        });
    })
  });
};

const updateEmployeeManager = () => {
  //get all the employee list 
  connection.query("SELECT * FROM EMPLOYEE ORDER BY last_name", (err, emplRes) => {
    if (err) throw err;
    const employeeArr = [];
    emplRes.forEach(({ first_name, last_name, id }) => {
      employeeArr.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    const managerChoice = [{
      name: 'None',
      value: 0
    }]; //an employee could have no manager
    emplRes.forEach(({ first_name, last_name, id }) => {
      managerChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: employeeArr,
        message: "Please select an employee to update."
      },
      {
        type: "list",
        name: "manager_id",
        choices: managerChoice,
        message: "Please select employee's updated manager."
      }
    ]

    inquier.prompt(questions)
      .then(response => {
        const query = `UPDATE EMPLOYEE SET ? WHERE id = ?;`;
        let manager_id = response.manager_id !== 0 ? response.manager_id : null;
        connection.query(query, [
          { manager_id: manager_id },
          response.id
        ], (err, res) => {
          if (err) throw err;
          console.log("Employee's manager successfully updated!");
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  })

};

const deleteEmployee = () => {
  connection.query("SELECT * FROM EMPLOYEE ORDER BY last_name", (err, res) => {
    if (err) throw err;

    const employeeArr = [];
    res.forEach(({ first_name, last_name, id }) => {
      employeeArr.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: employeeArr,
        message: "Please select an employee to delete."
      }
    ];

    inquier.prompt(questions)
      .then(response => {
        const query = `DELETE FROM EMPLOYEE WHERE id = ?`;
        connection.query(query, [response.id], (err, res) => {
          if (err) throw err;
          console.log(`Employee successfully deleted!`);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
};

const deleteRole = () => {
  const departments = [];
  connection.query("SELECT * FROM ROLE", (err, res) => {
    if (err) throw err;

    const roleArr = [];
    res.forEach(({ title, id }) => {
      roleArr.push({
        name: title,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: roleArr,
        message: "Please select a role to delete."
      }
    ];

    inquier.prompt(questions)
      .then(response => {
        const query = `DELETE FROM ROLE WHERE id = ?`;
        connection.query(query, [response.id], (err, res) => {
          if (err) {
            console.log("Cannot delete a role that employees currently hold.");
            throw err;
          };
          console.log(`Role successfully deleted!`);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
};

const deleteDepartment = () => {
  const departments = [];
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    res.forEach(dep => {
      let qObj = {
        name: dep.name,
        value: dep.id
      }
      departments.push(qObj);
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: departments,
        message: "Please select a department to delete."
      }
    ];

    inquier.prompt(questions)
      .then(response => {
        const query = `DELETE FROM DEPARTMENT WHERE id = ?`;
        connection.query(query, [response.id], (err, res) => {
          if (err) {
            console.log("Cannot delete a department that has employees.");
            throw err;
          };
          console.log(`Department successfully deleted!`);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
};

const viewDepartmentBudget = () => {
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    const depArr = [];
    res.forEach(({ name, id }) => {
      depArr.push({
        name: name,
        value: id
      });
    });

    let questions = [
      {
        type: "rawlist",
        name: "id",
        choices: depArr,
        message: "Please select a department to view it's total utilization budget."
      }
    ];

    inquier.prompt(questions)
      .then(response => {
        const query = `SELECT D.name, SUM(salary) AS budget FROM
      EMPLOYEE AS E LEFT JOIN ROLE AS R
      ON E.role_id = R.id
      LEFT JOIN DEPARTMENT AS D
      ON R.department_id = D.id
      WHERE D.id = ?
      `;
        connection.query(query, [response.id], (err, res) => {
          if (err) throw err;
          console.table(res);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
};

const viewByManager = () => {
  //get all the employee list  ORDER BY last_name
  connection.query("SELECT * FROM EMPLOYEE ORDER BY last_name", (err, emplRes) => {
    if (err) throw err;
    const managerChoice = [{
      name: 'None',
      value: 0
    }];

    emplRes.forEach(({ first_name, last_name, id }) => {
      managerChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "manager_id",
        choices: managerChoice,
        message: "Which manager would you like to select?"
      },
    ]

    inquier.prompt(questions)
      .then(response => {
        let manager_id, query;
        if (response.manager_id) {
          query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
          R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
          FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
          LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
          LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id
          WHERE E.manager_id = ?;`;
        } else {
          manager_id = null;
          query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
          R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
          FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
          LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
          LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id
          WHERE E.manager_id is null;`;
        }
        connection.query(query, [response.manager_id], (err, res) => {
          if (err) throw err;
          console.table(res);
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
}

const viewByDepartment = () => {
  //get all the employee list 
  connection.query("SELECT * FROM DEPARTMENT", (err, emplRes) => {
    if (err) throw err;
    const departmentChoice = [];
    emplRes.forEach(({ name, id }) => {
      departmentChoice.push({
        name: name,
        value: id
      });
    });

    let questions = [
      {
        type: "rawlist",
        name: "department_id",
        choices: departmentChoice,
        message: "Which department would you like to select?"
      },
    ]

    inquier.prompt(questions)
      .then(response => {
        let query;
        if (response.department_id) {
          query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
          R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
          FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
          LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
          LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id
          WHERE R.department_id = ?;`;
        }
        connection.query(query, [response.department_id], (err, res) => {
          if (err) throw err;
          else {
            console.table(res);
          }
          initialPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  });
}