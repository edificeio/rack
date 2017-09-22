declare var Behaviours: any;
declare var http: any;
declare var model: any;
declare var _:any;

var rackResources = {}

console.log('rack behaviours loaded');

Behaviours.register('rack', {
	rights: {
		workflow: {
			access: 'fr.wseduc.rack.controllers.RackController|view',
			send: 'fr.wseduc.rack.controllers.RackController|postRack',
			listRack: 'fr.wseduc.rack.controllers.RackController|listRack',
			listUsers: 'fr.wseduc.rack.controllers.RackController|listUsers',
			workspaceCopy: 'fr.wseduc.rack.controllers.RackController|rackToWorkspace'
		}
	},
	resource: function(resource){
		if(!resource.myRights){
			resource.myRights = {};
		}

		for(var behaviour in rackResources){
			if(model.me.hasRight(resource, rackResources[behaviour]) || model.me.userId === resource.owner.userId){
				if(resource.myRights[behaviour] !== undefined){
					resource.myRights[behaviour] = resource.myRights[behaviour] && rackResources[behaviour];
				}
				else{
					resource.myRights[behaviour] = rackResources[behaviour];
				}
			}
		}

		if(model.me.userId === resource.owner){
			resource.myRights.share = rackResources[behaviour];
		}

		return resource;
	},
	resourceRights: function(){
		return []
	},
	loadResources: function(callback){
		http().get('/rack/list').done(function(rack){
			this.resources = rack.filter(i => i.folder !== 'Trash').map(rack => {
				rack.icon = rack.icon || '/img/illustrations/image-default.svg';
				return {
				    title: rack.name,
				    owner: { name: rack.fromName, userId: rack.to },
				    icon: rack.icon,
				    path: '/rack#/view-rack/' + rack._id,
				    _id: rack._id
				};
			    });
			callback(this.resources);
		}.bind(this));
	}
});
