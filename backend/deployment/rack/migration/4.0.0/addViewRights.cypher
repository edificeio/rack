MATCH (a:Action {name:"fr.wseduc.rack.controllers.RackController|viewInbox",type:"SECURED_ACTION_WORKFLOW"})
WITH a
MATCH (b:Action{name:"fr.wseduc.rack.controllers.RackController|view"})<-[:AUTHORIZE]-(ro:Role)
WITH a,ro
MERGE (a)<-[:AUTHORIZE]-(ro);

MATCH (a:Action {name:"fr.wseduc.rack.controllers.RackController|viewDeposits",type:"SECURED_ACTION_WORKFLOW"})
WITH a
MATCH (b:Action{name:"fr.wseduc.rack.controllers.RackController|view"})<-[:AUTHORIZE]-(ro:Role)
WITH a,ro
MERGE (a)<-[:AUTHORIZE]-(ro);

MATCH (a:Action {name:"fr.wseduc.rack.controllers.RackController|viewTrash",type:"SECURED_ACTION_WORKFLOW"})
WITH a
MATCH (b:Action{name:"fr.wseduc.rack.controllers.RackController|view"})<-[:AUTHORIZE]-(ro:Role)
WITH a,ro
MERGE (a)<-[:AUTHORIZE]-(ro);