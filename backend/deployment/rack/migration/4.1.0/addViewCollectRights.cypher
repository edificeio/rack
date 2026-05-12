MATCH (a:Action {name:"fr.wseduc.rack.controllers.RackController|viewCollect",type:"SECURED_ACTION_WORKFLOW"})
WITH a
MATCH (b:Action{name:"fr.wseduc.rack.controllers.RackController|view"})<-[:AUTHORIZE]-(ro:Role)
WITH a,ro
MERGE (a)<-[:AUTHORIZE]-(ro);
