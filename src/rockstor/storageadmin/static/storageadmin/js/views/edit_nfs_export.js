/*
 *
 * @licstart  The following is the entire license notice for the
 * JavaScript code in this page.
 *
 * Copyright (c) 2012-2013 RockStor, Inc. <http://rockstor.com>
 * This file is part of RockStor.
 *
 * RockStor is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation; either version 2 of the License,
 * or (at your option) any later version.
 *
 * RockStor is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 *
 */

EditNFSExportView = RockstorLayoutView.extend({
	events: {
		'click #cancel': 'cancel'
	},

	initialize: function() {
		this.constructor.__super__.initialize.apply(this, arguments);
		this.template = window.JST.nfs_edit_nfs_export;
		this.shares = new ShareCollection();
		this.nfsExportGroupId = this.options.nfsExportGroupId;
		if(this.nfsExportGroupId > 0) {
			this.nfsExportGroup = new NFSExportGroup({id: this.nfsExportGroupId});
			this.nfsExportNotEmpty = true;
			this.dependencies.push(this.nfsExportGroup);
		} else {
			this.nfsExportGroup = new NFSExportGroup();
		}
		// dont paginate shares for now
		this.shares.pageSize = RockStorGlobals.maxPageSize;
		this.dependencies.push(this.shares);
		this.modify_choices = [
		                       {name: 'Writable', value: 'rw'},
		                       {name: 'Read-only', value: 'ro'},
		                       ];
		this.sync_choices = [
		                     {name: 'async', value: 'async'},
		                     {name: 'sync', value: 'sync'},
		                     ];
		this.initHandlebarHelpers();
	},

	render: function() {
		this.fetch(this.renderExportForm, this);
		return this;
	},

	renderExportForm: function() {
		var _this = this;
		$(this.el).html(this.template({
			shares: this.shares,
			nfsExportGroup: this.nfsExportGroup,
			nfsExportNotEmpty: this.nfsExportNotEmpty,
			nfsExportAdminHost: this.nfsExportGroup.get('admin_host'),
			nfsExportHostString: this.nfsExportGroup.get('host_str'),
			modify_choices: this.modify_choices,
			sync_choices: this.sync_choices
		}));
		this.$('#shares').chosen();
		this.$('#edit-nfs-export-form :input').tooltip({placement: 'right'});

		$.validator.setDefaults({ ignore: ":hidden:not(select)" });

		this.$('#edit-nfs-export-form').validate({
			onfocusout: false,
			onkeyup: false,
			rules: {
				shares: 'required',
				host_str: 'required'
			},
			submitHandler: function() {
				var button = $('#update-nfs-export');
				if (buttonDisabled(button)) return false;
				disableButton(button);
				var submitmethod = 'POST';
				var posturl = '/api/nfs-exports';
				if(_this.nfsExportGroupId > 0){
					submitmethod = 'PUT';
					posturl += '/'+_this.nfsExportGroupId;
				}
				$.ajax({
					url: posturl,
					type: submitmethod,
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify(_this.$('#edit-nfs-export-form').getJSON()),
					success: function() {
						app_router.navigate('nfs-exports', {trigger: true});
					},
					error: function(xhr, status, error) {
						enableButton(button);
					}
				});
				return false;
			}
		});
	},

	cancel: function(event) {
		event.preventDefault();
		app_router.navigate('nfs-exports', {trigger: true});
	},

	initHandlebarHelpers: function(){
		Handlebars.registerHelper('display_shares_dropdown', function(){
			var html = '',
			nShares = _.map(this.nfsExportGroup.get('exports'),
					function(e) { return e.share; });
			this.shares.each(function(share, index) { 
				var shareName = share.get('name');
				if (_.indexOf(nShares, shareName) != -1) { 
					html += '<option value="' + shareName + '" selected="selected">' + shareName + '</option>';
				} else { 
					html += '<option value="' + shareName + '" >' + shareName+ '</option>';
				} 
			});

			return new Handlebars.SafeString(html);
		});


		Handlebars.registerHelper('display_accessType_choices', function(){
			var html = '',
			nfsEditable = this.nfsExportGroup.get('editable');
			_.each(this.modify_choices, function(c) {
				var choiceName = c.name,
				choiceValue = c.value;
				html += '<label class="radio-inline">';
				if (nfsEditable) {
					if (nfsEditable == choiceValue) { 
						html += '<input type="radio" name="mod_choice" value="' + choiceValue + '" checked="checked">';
					} else {
						html += '<input type="radio" name="mod_choice" value="' + choiceValue + '" >';
					}		     
				} else {
					if (choiceName == "Writable") { 
						html += '<input type="radio" name="mod_choice" value="' + choiceValue + '" checked="checked">';
					} else {
						html += '<input type="radio" name="mod_choice" value="' + choiceValue + '">';
					} 
				} 
				html += choiceName;
				html += '</label>';
			});
			
			return new Handlebars.SafeString(html);
			
		});

		Handlebars.registerHelper('display_sync_choices', function(){
			var html = '',
			nfsSyncable = this.nfsExportGroup.get('syncable');

			_.each(this.sync_choices, function(c) {
				var choiceName = c.name,
				choiceValue = c.value;
				html += '<label class="radio-inline">';
				if (nfsSyncable) {
					if (nfsSyncable == choiceValue) { 
						html += '<input type="radio" name="sync_choice" value="' + choiceValue + '" checked="checked">';
					} else {
						html += '<input type="radio" name="sync_choice" value="' + choiceValue + '" >';
					}
				} else { 
					if (choiceName == "async") { 
						html += '<input type="radio" name="sync_choice" value="' + choiceValue + '" checked="checked">';
					} else {
						html += '<input type="radio" name="sync_choice" value="' + choiceValue + '">';
					} 
				}
				html += choiceName;
				html += '</label>';
			});

			return new Handlebars.SafeString(html);
		});

	}

});
