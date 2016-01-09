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

AddSambaExportView = RockstorLayoutView.extend({
	events: {
		'click #cancel': 'cancel',
		'click #shadow-copy-info': 'shadowCopyInfo',
		'click #shadow_copy': 'toggleSnapPrefix'
	},

	initialize: function() {
		this.constructor.__super__.initialize.apply(this, arguments);
		this.template = window.JST.samba_add_samba_export;
		this.shares = new ShareCollection();
		this.users = new UserCollection();
		// dont paginate shares for now
		this.shares.pageSize = RockStorGlobals.maxPageSize;
		this.users.pageSize = RockStorGlobals.maxPageSize;
		this.dependencies.push(this.shares);
		this.dependencies.push(this.users);
		this.sambaShareId = this.options.sambaShareId || null;
		this.sambaShares = new SambaCollection({sambaShareId: this.sambaShareId});
		this.dependencies.push(this.sambaShares);

		this.yes_no_choices = [
		                       {name: 'yes', value: 'yes'},
		                       {name: 'no', value: 'no'},
		                       ];
		this.browsable_choices = this.yes_no_choices;
		this.guest_ok_choices = this.yes_no_choices;
		this.read_only_choices = this.yes_no_choices;
		this.initHandlebarHelpers();
	},


	render: function() {
		this.fetch(this.renderSambaForm, this);
		return this;
	},

	renderSambaForm: function() {
		var _this = this;
		this.freeShares = this.shares.reject(function(share) {
			s = this.sambaShares.find(function(sambaShare) {
				return (sambaShare.get('share') == share.get('name'));
			});
			return !_.isUndefined(s);
		}, this);

		this.sShares = this.shares.reject(function(share) {
			s = this.sambaShares.find(function(sambaShare) {
				return (sambaShare.get('share') != share.get('name'));
			});
			return !_.isUndefined(s);
		}, this);

		//Edit view gets the sambaShareId from initalize function and Null in Add view.
		var sambaShareIdNotNull = false;
		var sambaShareIdNull = false;
		
		if(this.sambaShareId == null){
			sambaShareIdNull = true;
		}
		if(this.sambaShareId != null){
			this.sShares = this.sambaShares.get(this.sambaShareId);
			sambaShareIdNotNull = true;
		}else{
			this.sShares = null;
		}

		var configList,
		smbShareName,
		smbShadowCopy,
		smbComments,
		smbSnapPrefix = '';
		if (this.sShares != null) {
			var config = this.sShares.get('custom_config'),
			smbShareName = this.sShares.get('share'),
			smbShadowCopy = this.sShares.get("shadow_copy"),
			smbComments = this.sShares.get("comments"),
			smbSnapPrefix = this.sShares.get("snapshot_prefix");

			for(i=0;i<config.length;i++){
				configList = configList+config[i].custom_config+'\n';
			}
		}

		var smbSnapshotPrefixBool = false;
		if(sambaShareIdNotNull && smbShadowCopy){
			smbSnapshotPrefixBool = true;
		}
		$(this.el).html(this.template({
			shares: this.freeShares,
			//smbShare: this.sShares,
			smbShareName: smbShareName,
			smbShareShadowCopy: smbShadowCopy,
			smbShareComments: smbComments,
			smbShareSnapPrefix: smbSnapPrefix,
			smbSnapshotPrefixRule: smbSnapshotPrefixBool,
			users: this.users,
			configList: configList,
			sambaShareId: this.sambaShareId,
			sambaShareIdNull: sambaShareIdNull,
			sambaShareIdNotNull: sambaShareIdNotNull,
			browsable_choices: this.browsable_choices,
			guest_ok_choices: this.guest_ok_choices,
			read_only_choices: this.read_only_choices,
			shadow_copy_choices: this.yes_no_choices,

		}));
		if(this.sambaShareId == null) {
			this.$('#shares').chosen();
		}
		this.$('#admin_users').chosen();

		this.$('#add-samba-export-form :input').tooltip({
			html: true,
			placement: 'right'
		});

		$.validator.setDefaults({ ignore: ":hidden:not(select)" });

		$('#add-samba-export-form').validate({
			onfocusout: false,
			onkeyup: false,
			rules: {
				shares: 'required',
				snapshot_prefix: {
					required: {
						depends: function(element) {
							return _this.$('#shadow_copy').prop('checked');
						}
					}
				}
			},

			submitHandler: function() {
				var button = $('#create-samba-export');
				var custom_config = _this.$('#custom_config').val();
				var entries = [];
				if (!_.isNull(custom_config) && custom_config.trim() != '') entries = custom_config.trim().split('\n');
				if (buttonDisabled(button)) return false;
				disableButton(button);
				var submitmethod = 'POST';
				var posturl = '/api/samba';
				if(_this.sambaShareId != null){
					submitmethod = 'PUT';
					posturl += '/'+_this.sambaShareId;
				}
				var data = _this.$('#add-samba-export-form').getJSON();
				data.custom_config = entries;
				$.ajax({
					url: posturl,
					type: submitmethod,
					dataType: 'json',
					contentType: 'application/json',
					data: JSON.stringify(data),
					success: function() {
						enableButton(button);
						_this.$('#add-samba-export-form :input').tooltip('hide');
						app_router.navigate('samba-exports', {trigger: true});
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
		this.$('#add-samba-export-form :input').tooltip('hide');
		app_router.navigate('samba-exports', {trigger: true});
	},

	shadowCopyInfo: function(event) {
		event.preventDefault();
		$('#shadow-copy-info-modal').modal({
			keyboard: false,
			show: false,
			backdrop: 'static'
		});
		$('#shadow-copy-info-modal').modal('show');
	},

	toggleSnapPrefix: function() {
		var cbox = this.$('#shadow_copy');
		if (cbox.prop('checked')) {
			this.$('#snapprefix-ph').css('visibility', 'visible');
		} else {
			this.$('#snapprefix-ph').css('visibility', 'hidden');
		}
	},

	initHandlebarHelpers: function(){
		Handlebars.registerHelper('display_samba_shares', function(){
			var html = '';
			if (this.sambaShareIdNull) { 
				html += '<select class="form-control" name="shares" id="shares" size="10" data-placeholder="Select shares to export" multiple>';
				_.each(this.shares, function(share, index) {
					var shareName = share.get('name');
					html += '<option value="' + shareName + '" >' + shareName + '</option>';
				});
				html += '</select>';
			} else {}

			return new Handlebars.SafeString(html);
		});

		Handlebars.registerHelper('display_adminUser_options', function(){
			var html = '';
			this.users.each(function(user, index) {
				var userName = user.get("username");
				if (this.sambaShareIdNotNull && this.smbShare.get('admin_users').length > 0) {
					for(i=0; i< this.smbShare.get('admin_users').length; i++){
						if(this.smbShare.get('admin_users')[i].username == userName){ 
							html += '<option value="' + userName + '" selected="selected">' + userName + '</option>';
						} else{
							html += '<option value="' + userName + '">' + userName + '</option>';

						} 
					} 

				}else{
					html += '<option value="' + userName + '">' + userName + '</option>';

				}
			});

			return new Handlebars.SafeString(html);
		});

		Handlebars.registerHelper('display_browsable_options', function(){
			var html = '';

			_.each(this.browsable_choices, function(c) {
				var choiceValue = c.value,
				choiceName = c.name;
				html += '<label class="radio-inline">';
				if (this.sambaShareIdNotNull){
					if(choiceValue == smbShare.get("browsable")){ 
						html += '<input type="radio" name="browsable" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="browsable" value="' + choiceValue + '"> ' + choiceName;
					} 
				}else {
					if(choiceValue == 'yes'){
						html += '<input type="radio" name="browsable" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="browsable" value="' + choiceValue + '"> ' + choiceName;
					} 
				} 
				html += '</label>';
			});

			return new Handlebars.SafeString(html);
		});

		Handlebars.registerHelper('display_guestOk_options', function(){
			var html = '';

			_.each(this.guest_ok_choices, function(c) {
				var choiceValue = c.value,
				choiceName = c.name;
				html += '<label class="radio-inline">';
				if (this.sambaShareIdNotNull){
					if(choiceValue == smbShare.get("guest_ok")){ 
						html += '<input type="radio" name="guest_ok" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="guest_ok" value="' + choiceValue + '"> ' + choiceName;
					} 
				}else {
					if(choiceValue == 'no'){
						html += '<input type="radio" name="guest_ok" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="guest_ok" value="' + choiceValue + '"> ' + choiceName;
					} 
				} 
				html += '</label>';
			});

			return new Handlebars.SafeString(html);
		});

		Handlebars.registerHelper('display_readOnly_options', function(){
			var html = '';

			_.each(this.read_only_choices, function(c) {
				var choiceValue = c.value,
				choiceName = c.name;
				html += '<label class="radio-inline">';
				if (this.sambaShareIdNotNull){
					if(choiceValue == smbShare.get("read_only")){ 
						html += '<input type="radio" name="read_only" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="read_only" value="' + choiceValue + '"> ' + choiceName;
					} 
				}else {
					if(choiceValue == 'yes'){
						html += '<input type="radio" name="read_only" value="' + choiceValue + '" checked> ' + choiceName;
					}else{ 
						html += '<input type="radio" name="read_only" value="' + choiceValue + '"> ' + choiceName;
					} 
				} 
				html += '</label>';
			});

			return new Handlebars.SafeString(html);
		});
	}

});
