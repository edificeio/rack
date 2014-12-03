/**
	Application routes.
**/
routes.define(function($routeProvider){
	$routeProvider
		.otherwise({
			action: 'defaultView'
		})
})

/**
	Wrapper controller
	------------------
	Main controller.
**/
function RackController($scope, $rootScope, $timeout, model, template, route, date){

	$scope.rackList = model.rackCollection.racks
	$scope.template = template
	$scope.lang = lang

	route({
		defaultView: function(){
			$scope.openView('main', 'library')
		}
	})

	$rootScope.longDate = function(dateStr){
		return date.create(dateStr.replace('.',':')).format('lll')
	}

	$scope.openView = function(container, view){
		if(container === "lightbox")
			ui.showLightbox()
		else
			ui.hideLightbox()
		template.open(container, view)
	}

	$scope.openNewRack = function(){
		$scope.getVisibleUsers()
		$scope.newFile = { name: lang.translate('nofile'), chosenFiles: [] }
		$scope.openView('lightbox', 'send-rack')
	}

	$scope.openMoveToDocs = function(){
		$scope.getWorkspaceFolders()
		$scope.newFolder = {
			name: "",
			path: ""
		}
		//Workaround recursive templates overload
		$scope.refreshDocsView()
	}

	$scope.refreshDocsView = function(){
		template.close('lightbox')
		$timeout(function(){
			$scope.openView('lightbox', 'copy-files')
		}, 10)
	}

	// QUOTA //

	$scope.maxQuota = 8;
	$scope.usedQuota = 4;

	$scope.quota = {
		max: 1,
		used: 0,
		unit: 'Mo'
	};

	$scope.getQuota = function(){
		http().get('/workspace/quota/user/' + model.me.userId).done(function(data){
			//to mo
			data.quota = data.quota / (1024 * 1024);
			data.storage = data.storage / (1024 * 1024);

			if(data.quota > 2000){
				data.quota = Math.round((data.quota / 1024) * 10) / 10;
				data.storage = Math.round((data.storage / 1024) * 10) / 10;
				$scope.quota.unit = 'Go';
			}
			else{
				data.quota = Math.round(data.quota);
				data.storage = Math.round(data.storage);
			}

			$scope.quota.max = data.quota;
			$scope.quota.used = data.storage;
			$scope.$apply('quota');
		});
	}

	$scope.getQuota();

	// RACK VISIBLE USERS //

	$scope.visibleUsers = model.userCollection.visibleUsers

	$scope.getVisibleUsers = function(){
		$scope.visibleUsers.sync()
	}

	//NEW RACK FILES//

	$scope.setFilesName = function(){
		$scope.newFile.name = ''
		$scope.newFile.chosenFiles = []
		for(var i = 0; i < $scope.newFile.files.length ; i++){
			var file = $scope.newFile.files[i]
			var splitList = file.name.split('.')
			var extension = splitList[splitList.length - 1]

			var newFile = { file: file, name: file.name.split('.' + extension)[0] }
			if($scope.newFile.name !== ''){
				$scope.newFile.name = $scope.newFile.name + ', '
			}
			$scope.newFile.name = $scope.newFile.name + file.name.split('.' + extension)[0]
			if(splitList.length > 1){
				newFile.extension = extension
			}
			else{
				newFile.extension = ''
			}
			$scope.newFile.chosenFiles.push(newFile)
		}
	}

	$scope.to = {
		id: ''
	}

	$scope.setRackTo = function(user){
		$scope.to.id = user.id
	}

	$scope.sendRackFiles = function(){
		for(var i = 0; i < $scope.newFile.files.length; i++){
			var formData = new FormData()

			formData.append('file', $scope.newFile.files[i])

			var n = $scope.newFile.files.length
			var url = '/rack/' + $scope.to.id
			$scope.loading = lang.translate('loading')
			http().postFile(url + '?thumbnail=120x120',  formData, { requestName: 'file-upload' }).done(function(e){
				ui.hideLightbox()
				$scope.loading = ''
				if(--n === 0){
					notify.info('rack.sent.message')
				}
			})
		}
	}

	// WORKSPACE FOLDERS //
	$scope.workspaceFolders = model.folderCollection.folders
	$scope.getWorkspaceFolders = function(hook){
		$scope.workspaceFolders.sync(
			function(){
				$scope.folder = { name: lang.translate('rack.root'), children: $scope.workspaceFolders.all, path: '', parent: '' }
				if(typeof hook === 'function')
					hook()
			}
		)
	}
	$scope.getWorkspaceFolders()

	$scope.isTargetFolder = function(folder){
		return $scope.targetFolder && $scope.targetFolder.path === folder.path
	}

	$scope.addTargetFolder = function(folder){
		$scope.targetFolder = folder
	}

	$scope.createEditFolder = function(){
		$scope.newFolder.path = $scope.targetFolder.path
		http().post('/workspace/folder', $scope.newFolder).done(function(newFolder){
			$scope.newFolder = {
				name: "",
				path: ""
			}
			$scope.targetFolder = null
			$scope.getWorkspaceFolders($scope.refreshDocsView)
		});
	}

	$scope.copy = function(){
		ui.hideLightbox();
		$scope.rackList.copyToWorkspace($scope.targetFolder.path)
	};

}

/**
	FolderController
	----------------
	Rack documents are splitted in 3 "folders" :
		- My rack
		- History
		- Trash
	This controller helps dealing with these 3 views.
**/
function FolderController($scope, $rootScope, model, template, $filter){

	$scope.filterRack = {}
	$scope.select = { all: false }
	$scope.ordering = '-sent'

	var DEFAULT_VIEW = function(){
		$scope.refreshListing(_.findWhere($scope.folders, {name: "mine"}))
	}

	//////////////////////
	//   Rack listing   //
	//////////////////////

	$scope.refreshListing = function(folder){
		$scope.filterRack = folder.filtering
		$scope.select.all = false
		$scope.rackList.sync()
		$scope.folder = folder
		if(!template.contains('list', 'table-list') && !template.contains('list', 'icons-list'))
			$scope.openView('list', 'icons-list')
	}

	$scope.folders = [
		{
			name: "mine",
			filtering: function(item){
				return item.to === model.me.userId && item.folder !== "Trash"
			},
			bottomBarButtons: [
				{
					name: "remove",
					showCondition : function(){	return true },
					onClick: function(){
						$scope.rackList.remove()
					}
				},
				{
					name: "rack.racktodocs",
					showCondition : function(){	return model.me.workflow.rack.workspaceCopy },
					onClick: function(){
						$scope.openMoveToDocs()
					}
				}
			]
		},
		{
			name: "history",
			filtering: {
				"from": model.me.userId
			},
			extraColumns: ["to"],
			readOnly: true
		},
		{
			name: "trash",
			filtering: function(item){
				return item.to === model.me.userId && item.folder === "Trash"
			},
			bottomBarButtons: [
				{
					name: "restore",
					showCondition : function(){ return true },
					onClick: function(){
						$scope.rackList.restore()
					}
				},
				{
					name: "remove",
					showCondition : function(){ return true },
					onClick: function(){
						$scope.rackList.delete($scope.getQuota)
					}
				}
			]
		}
	]

	//Deep filtering an Object based on another Object properties
	//Supports "dot notation" for accessing nested objects, ex: ({a {b: 1}} can be filtered using {"a.b": 1})
	var deepObjectFilter = function(object, filter){
		for(var prop in filter){
			var splitted_prop 	= prop.split(".")
			var obj_value 		= object
			var filter_value 	= filter[prop]
			for(i = 0; i < splitted_prop.length; i++){
				obj_value 		= obj_value[splitted_prop[i]]
			}
			if(filter_value instanceof Object && obj_value instanceof Object){
				if(!deepObjectFilter(obj_value, filter_value))
					return false
			} else if(obj_value !== filter_value)
				return false
		}
		return true
	}
	var rackObjectFiltering = function(item){ return deepObjectFilter(item, $scope.filterRack) }
	var selectMultiple = function(items){
		_.forEach(items, function(item){ item.selected = true })
	}

	$scope.switchAll = function(){
		if($scope.select.all){
			if(typeof $scope.filterRack === 'function'){
				selectMultiple($scope.rackList.filter($scope.filterRack))
			} else if(typeof $scope.filterRack === 'object'){
				selectMultiple($scope.rackList.filter(rackObjectFiltering))
			}
		}
		else{
			$scope.rackList.deselectAll();
		}
	}

	$scope.orderBy = function(what){
		$scope.ordering = ($scope.ordering === what ? '-' + what : what)
	}


	//Default view displayed on opening
	DEFAULT_VIEW()

}