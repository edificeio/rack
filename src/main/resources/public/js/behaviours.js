/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

	var rackResources = {};
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
	    resource: function (resource) {
	        if (!resource.myRights) {
	            resource.myRights = {};
	        }
	        for (var behaviour in rackResources) {
	            if (model.me.hasRight(resource, rackResources[behaviour]) || model.me.userId === resource.owner.userId) {
	                if (resource.myRights[behaviour] !== undefined) {
	                    resource.myRights[behaviour] = resource.myRights[behaviour] && rackResources[behaviour];
	                }
	                else {
	                    resource.myRights[behaviour] = rackResources[behaviour];
	                }
	            }
	        }
	        if (model.me.userId === resource.owner) {
	            resource.myRights.share = rackResources[behaviour];
	        }
	        return resource;
	    },
	    resourceRights: function () {
	        return [];
	    },
	    loadResources: function (callback) {
	        http().get('/rack/list').done(function (rack) {
	            this.resources = rack.filter(function (i) { return i.folder !== 'Trash'; }).map(function (rack) {
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


/***/ })
/******/ ]);
//# sourceMappingURL=behaviours.js.map