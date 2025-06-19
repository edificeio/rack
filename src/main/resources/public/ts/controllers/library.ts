import { notify, idiom as lang, template, routes, model, ng } from 'entcore';
import { Rack } from '../model/rack';
import { _ } from 'entcore';
import { RackFile } from "../model";

export let libraryController = ng.controller("LibraryController", [
  "$scope",
  "$filter",
  function ($scope, $filter) {
    $scope.filterRack = Rack.instance.filters.mine;
    $scope.totalDisplayed = 0;
    $scope.select = {
      all: false,
      folderName: "mine",
    };
    $scope.ordering = "-sent";
    $scope.groupedRacks = {};
    $scope.shouldGroup = false;
    $scope.groupKeys = [];
    $scope.groupStates = {};

    $scope.initGroupStates = (groupKeys) => {
      groupKeys.forEach((key) => {
        if (!$scope.groupStates[key]) {
          $scope.groupStates[key] = {
            expanded: true,
            allSelected: false,
          };
        }
      });
    };

    $scope.toggleGroup = (groupKey) => {
      $scope.groupStates[groupKey].expanded =
        !$scope.groupStates[groupKey].expanded;
    };

    $scope.toggleGroupSelection = (groupKey) => {
      const allSelected = $scope.groupStates[groupKey].allSelected;
      $scope.groupedRacks[groupKey].forEach((rack) => {
        rack.selected = allSelected;
      });
    };

    $scope.updateGroupSelection = (groupKey) => {
      const items = $scope.groupedRacks[groupKey];
      const selectedCount = items.filter((item) => item.selected).length;
      $scope.groupStates[groupKey].allSelected = selectedCount === items.length;
    };

    $scope.groupRacksBySenderClassName = () => {
      if (
        !$scope.select.folderName ||
        $scope.select.folderName !== "mine" ||
        model.me.type !== "ENSEIGNANT"
      ) {
        $scope.groupedRacks = {};
        $scope.shouldGroup = false;
        $scope.groupKeys = [];
        return;
      }

      const filteredRacks = $filter("filter")(
        $scope.rackList.all,
        $scope.filterRack,
        true
      );
      const tempGroups = {};
      let hasGrouping = false;

      filteredRacks.forEach((rack) => {
        const groupKey = rack.senderClassName || "Inconnu";
        if (rack.senderClassName) hasGrouping = true;

        if (!tempGroups[groupKey]) {
          tempGroups[groupKey] = [];
        }
        tempGroups[groupKey].push(rack);
      });

      const orderedGroups = {};
      const sortedKeys = Object.keys(tempGroups).sort((a, b) => {
        if (a === "Inconnu") return 1;
        if (b === "Inconnu") return -1;
        return a.localeCompare(b);
      });

      sortedKeys.forEach((key) => {
        orderedGroups[key] = tempGroups[key].sort((a, b) => {
          const orderField = $scope.ordering.replace("-", "");
          const isDescending = $scope.ordering.startsWith("-");

          let comparison = 0;
          if (a[orderField] < b[orderField]) comparison = -1;
          if (a[orderField] > b[orderField]) comparison = 1;

          return isDescending ? -comparison : comparison;
        });
      });

      $scope.shouldGroup = hasGrouping;
      $scope.groupedRacks = orderedGroups;
      $scope.groupKeys = sortedKeys;
      $scope.initGroupStates(sortedKeys);

      return orderedGroups;
    };

    $scope.open = (folderName: string) => {
      Rack.instance.files.selection.deselectAll();
      $scope.filterRack = Rack.instance.filters[folderName];
      $scope.select.all = false;
      $scope.select.folderName = folderName;
      Rack.instance.sync();
      template.open("toaster", "toaster/" + folderName);
      if (
        !template.contains("list", "table-list") &&
        !template.contains("list", "icons-list")
      ) {
        template.open("list", "table-list");
      }
    };

    $scope.trash = async () => {
      await Rack.instance.files.trashSelection();
      Rack.instance.files.selection.deselectAll();
      $scope.updateTotalDisplayed();
      $scope.$apply();
    };

    $scope.delete = async () => {
      await Rack.instance.files.delete();
      Rack.instance.files.selection.deselectAll();
      $scope.updateTotalDisplayed();
      $scope.$apply();
    };

    $scope.restore = async () => {
      await Rack.instance.files.restore();
      Rack.instance.files.selection.deselectAll();
      $scope.updateTotalDisplayed();
      $scope.$apply();
    };

    $scope.switchAll = function () {
      if ($scope.select.all) {
        if (typeof $scope.filterRack === "function") {
          $scope.rackList.all.forEach((item) => {
            item.selected = $scope.filterRack(item);
          });
        }
      } else {
        Rack.instance.files.selection.deselectAll();
      }
    };

    $scope.orderBy = (what) =>
      ($scope.ordering = $scope.ordering === what ? "-" + what : what);

    Rack.instance.eventer.on("sync", () => {
      $scope.groupRacksBySenderClassName();
      $scope.updateTotalDisplayed();
    });

    $scope.updateTotalDisplayed = () => {
      $scope.totalDisplayed = $filter("filter")(
        $scope.rackList.all,
        $scope.filterRack,
        true
      ).length;
      $scope.$apply();
    };

    $scope.syncStatus = () => {
      // Because we only want to display the sync status for the "mine" folder, and for students
      // we can return straight away if it doesn't match those conditions
      if (model.me.type !== "ETUDIANT" || $scope.select.folderName !== "mine") {
        return false;
      }

      const files = $filter("filter")(
        $scope.rackList.all,
        Rack.instance.filters.mine,
        true
      );

      if (!files || files.length === 0) return false;

      for (let i = 0; i < files.length; i++) {
        if (files[i].synced === false) return false;
      }

      return true;
    };
  },
]);
