/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. Camunda licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
var fs = require('fs');

var template = fs.readFileSync(
  __dirname + '/cam-tasklist-task-detail-form-plugin.html',
  'utf8'
);

var angular = require('camunda-commons-ui/vendor/angular');

var Controller = [
  '$scope',
  '$location',
  '$q',
  'camAPI',
  'assignNotification',
  function($scope, $location, $q, camAPI, assignNotification) {
    // setup ///////////////////////////////////////////////////////////

    var Task = camAPI.resource('task');

    var errorHandler = $scope.errorHandler;

    var DEFAULT_OPTIONS = ($scope.options = {
      hideCompleteButton: false,
      hideLoadVariablesButton: false,
      disableCompleteButton: false,
      disableForm: false,
      disableAddVariableButton: false
    });

    var taskFormData = $scope.taskData.newChild($scope);

    taskFormData.provide('taskForm', [
      'task',
      function(task) {
        var deferred = $q.defer();

        if (!task || !task.id) {
          return deferred.resolve(null);
        }

        Task.form(task.id, function(err, res) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(res);
          }
        });

        return deferred.promise;
      }
    ]);

    // observer ///////////////////////////////////////////////////////////

    taskFormData.observe([
      'task',
      'isAssignee',
      function(task, isAssignee) {
        $scope.options = angular.copy(DEFAULT_OPTIONS);

        if (task && task.id) {
          $scope.params = {
            taskId: task.id,
            caseDefinitionId: task.caseDefinitionId,
            caseInstanceId: task.caseInstanceId,
            processDefinitionId: task.processDefinitionId,
            processInstanceId: task.processInstanceId
          };
        } else {
          $scope.params = null;
        }

        $scope.options.disableCompleteButton = !isAssignee;
        $scope.options.disableForm = !isAssignee;
        $scope.options.disableAddVariableButton = !isAssignee;
      }
    ]);

    $scope.taskFormState = taskFormData.observe('taskForm', function(taskForm) {
      $scope.taskForm = angular.copy(taskForm);
    });

    // task form /////////////////////////////////////////////////////////////////////////

    function clearTask() {
      // reseting the location leads that
      // the taskId will set to null and
      // the current selected task will
      // also be set to null, so that the
      // view gets clear
      var searchParams = $location.search();
      delete searchParams.task;
      delete searchParams.detailsTab;
      $location.search(searchParams);

      // list of tasks must be reloaded as
      // well: changed properties on this
      // task may cause the list to change
      taskFormData.changed('taskList');
    }

    // will be called when the form has been submitted
    $scope.completionCallback = function(err) {
      if (err) {
        return errorHandler('COMPLETE_ERROR', err);
      }

      if ($scope.task.processInstanceId) {
        assignNotification({
          assignee: $scope.task.assignee,
          processInstanceId: $scope.task.processInstanceId
        });
      } else if ($scope.task.caseInstanceId) {
        assignNotification({
          assignee: $scope.task.assignee,
          caseInstanceId: $scope.task.caseInstanceId
        });
      }

      clearTask();
    };
  }
];

var Configuration = function PluginConfiguration(ViewsProvider) {
  ViewsProvider.registerDefaultView('tasklist.task.detail', {
    id: 'task-detail-form',
    label: 'FORM',
    template: template,
    controller: Controller,
    priority: 1000
  });
};

Configuration.$inject = ['ViewsProvider'];

module.exports = Configuration;
