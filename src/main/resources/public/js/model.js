/// File extension format
var roleFromFileType = function(fileType){
	var types = {
		'doc': function(type){
			return type.indexOf('document') !== -1 && type.indexOf('wordprocessing') !== -1;
		},
		'xls': function(type){
			return (type.indexOf('document') !== -1 && type.indexOf('spreadsheet') !== -1) || (type.indexOf('ms-excel') !== -1);
		},
		'img': function(type){
			return type.indexOf('image') !== -1;
		},
		'pdf': function(type){
			return type.indexOf('pdf') !== -1 || type === 'application/x-download';
		},
		'ppt': function(type){
			return (type.indexOf('document') !== -1 && type.indexOf('presentation') !== -1) || type.indexOf('powerpoint') !== -1;
		},
		'video': function(type){
			return type.indexOf('video') !== -1;
		},
		'audio': function(type){
			return type.indexOf('audio') !== -1;
		}
	};

	for(var type in types){
		if(types[type](fileType)){
			return type;
		}
	}

	return 'unknown';
}

//  [RACK]   //
function Rack(){}
Rack.prototype = {
	API_PATH 	: "/rack",

	delete 		: function(){ return http().delete	(this.API_PATH + '/' + this._id).done(function(){ notify.info('rack.notify.deleted') }) },
	trash 		: function(){ return http().put		(this.API_PATH + '/' + this._id + '/trash').done(function(){ notify.info('rack.notify.trashed') }) },
	restore 	: function(){ return http().put		(this.API_PATH + '/' + this._id + '/recover').done(function(){ notify.info('rack.notify.restored') }) }
}

//  [RACK COLLECTION]   //
function RackCollection(){
	this.collection(Rack, {
		sync: function(){
			http().get("rack/list").done(function(data){
				this.load(data)
				this.all.forEach(function(item){
					item.metadata.contentType = roleFromFileType(item.metadata['content-type']);
				})
			}.bind(this))
		},
		remove: function(){
			var collection = this
			var parsedCount = 0
			this.selection().forEach(function(item){
				item.trash().done(function(){
					if(++parsedCount === collection.selection().length){
						if(collection.selection().length > 1){
							notify.info('rack.notify.trashed.plural');
						}
						else{
							notify.info('rack.notify.trashed');
						}
						collection.sync()
					}
				})
			})
		},
		delete: function(hook){
			var collection = this
			var parsedCount = 0
			this.selection().forEach(function(item){
				item.delete().done(function(){
					if(++parsedCount === collection.selection().length){
						if(collection.selection().length > 1){
							notify.info('rack.notify.deleted.plural');
						}
						else{
							notify.info('rack.notify.deleted');
						}

						collection.sync()
						if(typeof hook === 'function')
							hook()
					}
				})
			})
		},
		restore: function(){
			var collection = this
			var parsedCount = 0
			this.selection().forEach(function(item){
				item.restore().done(function(){
					if(++parsedCount === collection.selection().length){
						if(collection.selection().length > 1){
							notify.info('rack.notify.restored.plural');
						}
						else{
							notify.info('rack.notify.restored');
						}
						collection.sync()
					}
				})
			})
		},
		copyToWorkspace : function(folder){
			var collection = this
			return http().postJson('rack/copy', {ids: _.pluck(collection.selection(), '_id'), folder: folder}).done(function(){
				if(collection.selection().length > 1){
					notify.info('rack.notify.copyToWorkspace.plural');
				}
				else{
					notify.info('rack.notify.copyToWorkspace');
				}
			})
		}
	})
}

// [VISIBLE USERS]
function VisibleUser(){}
function VisibleGroup(){}
function VisibleCollection(){
	var rootCollection = this
	this.collection(VisibleGroup,{})
	this.collection(VisibleUser, {
		sync: function(){
			http().get("/rack/users/available").done(function(users){
				this.load(users)
				http().get("/rack/groups/available").done(function(groupsData){
					var groups = []
					users.forEach(function(user){
						user.groups.forEach(function(group){
							if(_.findWhere(groups, {id: group.id}) === undefined &&
							   _.findWhere(groupsData, {id: group.id}) !== undefined){
								groups.push(new VisibleGroup({
									id: group.id,
									name: group.name
								}))
							}
						})
					})
					rootCollection.visibleGroups.load(groups)
				})
			}.bind(this))
		}
	})
}

// [WORKSPACE FOLDERS]
function Folder(path){
	var underscoreIndex = path.lastIndexOf("_")

	this.path = 	path
	this.name = 	underscoreIndex < 0 ? path 	: path.substring(underscoreIndex + 1)
	this.parent = 	underscoreIndex < 0 ? "" 	: path.substring(0, underscoreIndex)
	this.children = []
}
function FolderCollection(){
	this.collection(Folder, {
		sync: function(hook){
			collection = this
			collection.all.splice(0, collection.all.length)
			http().get("/workspace/folders?filter=owner").done(function(folders){
				_.forEach(folders, function(folderPath){
					if(folderPath.indexOf("Trash") !== 0){
						var folder = new Folder(folderPath)
						collection.push(folder)
					}
				})
				collection.forEach(function(folder){
					if(folder.parent){
						collection.findWhere({ path: folder.parent}).children.push(folder)
						folder.toremove = true
					}
				})
				collection.forEach(function(folder){
					if(folder.toremove)
						collection.remove(folder)
				})
				if(typeof hook === "function")
					hook()
			}.bind(this))
		}
	})
}

///////////////////////
///   MODEL.BUILD   ///

model.build = function(){
	model.me.workflow.load(['rack'])
	this.makeModels([Rack, RackCollection, VisibleUser, VisibleGroup, VisibleCollection, Folder, FolderCollection])

	this.rackCollection 	= new RackCollection()
	this.visibleCollection 	= new VisibleCollection()
	this.folderCollection 	= new FolderCollection()
}

///////////////////////
