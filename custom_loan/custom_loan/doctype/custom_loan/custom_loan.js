// Copyright (c) 2023, VV Systems Developer and contributors
// For license information, please see license.txt

{% include 'erpnext/loan_management/loan_common.js' %};

frappe.ui.form.on("Custom Loan", {
	setup: function(frm) {
		frm.make_methods = {
			'Loan Disbursement': function() { frm.trigger('make_loan_disbursement') },
			'Loan Write Off': function() { frm.trigger('make_loan_write_off_entry') },
			'Loan Repayment By External Sources': function() { frm.trigger('make_loan_write_off_by_external_sources_entry') },
		}
	},
	onload: function (frm) {
		// Ignore loan security pledge on cancel of loan
		frm.ignore_doctypes_on_cancel_all = ["Loan Security Pledge"];

		frm.set_query("loan_application", function () {
			return {
				"filters": {
					"applicant": frm.doc.applicant,
					"docstatus": 1,
					"status": "Approved"
				}
			};
		});

		frm.set_query("loan_type", function () {
			return {
				"filters": {
					"docstatus": 1,
					"company": frm.doc.company
				}
			};
		});

		$.each(["penalty_income_account", "interest_income_account"], function(i, field) {
			frm.set_query(field, function () {
				return {
					"filters": {
						"company": frm.doc.company,
						"root_type": "Income",
						"is_group": 0
					}
				};
			});
		});

		$.each(["payment_account", "loan_account", "disbursement_account"], function (i, field) {
			frm.set_query(field, function () {
				return {
					"filters": {
						"company": frm.doc.company,
						"root_type": "Asset",
						"is_group": 0
					}
				};
			});
		})

	},

	dont_deduct_this_month: (frm) => {
		var options = [];
				var options2 = [];
				var options3 = [];
				var options4 = [];
				var options5 = [];
				
				var d = frm.doc.repayment_schedule;
				for (var i = 0; i < d.length; i++) {
					if(d[i].is_paid === 0 && d[i].total_payment > 0) {
						options.push({value: d[i].payment_date, label: d[i].payment_date});
						options2.push({value: d[i].total_payment, label: d[i].total_payment});
						}
					if(d[i].is_paid === 1 && d[i].total_payment > 0) {
						options3.push({value: d[i].payment_date, label: d[i].payment_date});
						options4.push({value: d[i].total_payment, label: d[i].total_payment});
					}
						options5.push({date: d[i].payment_date, amount: d[i].total_payment});
				}
				frappe.prompt([
					{fieldname: "payment_date", label: __("Date which is not to deduct"), fieldtype: "Select", options: options, reqd: 1},
				  ], function (data) {

					var daten = new Date(data.payment_date);
				var year = daten.getFullYear();
				var month = daten.getMonth() + 1;
				var day = 1;
				var formattedDaten = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

				frappe.call({
					method: "custom_loan.Custom.loan.update_additional_salary",
					args: {
						amount: 0,
						loan_amount: frm.doc.loan_amount,
						source: frm.doc.name,
						input_amount: frm.doc.total_amount_paid,
						input_date: data.payment_date,
						loan: frm.doc.name,
						type: "Dont Deduct This Month",
						payment_date: formattedDaten
					},
					callback: function(me){
							if (me.message === "pass"){
								frm.refresh_field("repayment_schedule");
							}
					}
				});
				}, __("Choose a Certain Period not to deduct"), __("Update"));	
	},
	deduct_amount: (frm) => {
		frappe.call({
			method: "frappe.client.get",
			args: {
			doctype: "Custom Loan",
			name: frm.doc.name
			},
			callback: function(r) {
			var options = [];
			$.each(r.message.repayment_schedule, function(i, d) {
			if(d.is_paid === 0 && d.total_payment > 0) {
			options.push({value: d.payment_date, label: d.payment_date});
			}
			});
			frappe.prompt([
				{fieldname: "payment_date", label: __("Date to change deduction Amount"), fieldtype: "Select", options: options, reqd: 1},
				{fieldname: "amount", label: __("Amount"), fieldtype: "Currency", reqd: 1}
			  ], function (data) {
				var daten = new Date(data.payment_date);
				var year = daten.getFullYear();
				var month = daten.getMonth() + 1;
				var day = 1;
				var formattedDaten = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

				frappe.call({
					method: "custom_loan.Custom.loan.update_additional_salary",
					args: {
						amount: data.amount,

						loan_amount: frm.doc.loan_amount,
						source: frm.doc.name,
						input_amount: data.amount,
						input_date: data.payment_date,
						loan: frm.doc.name,
						type: "Deduction Amount",
						payment_date: formattedDaten
					},
					callback: function(me){
							if (me.message === "pass"){
								frm.refresh_field("repayment_schedule");
							}
					}
				});
			}, __("Change Deduction Amount for a Chosen Period"), __("Update"));
		}
	});
	},
	deduction_till: (frm) => {
		frappe.call({
			method: "frappe.client.get",
			args: {
			doctype: "Custom Loan",
			name: frm.doc.name
			},
			callback: function(r) {
			var options = [];
			var options2 = [];
			var options4 = [];
			var options5 = [];
			$.each(r.message.repayment_schedule, function(i, d) {
				if(d.is_paid === 1) {
					options.push({value: d.total_payment, label: d.total_payment});
					options2.push({value: d.payment_date, label: d.payment_date});
				}
				if(d.is_paid === 0 && d.total_payment > 0) {
					options4.push({value: d.total_payment, label: d.total_payment});
					options5.push({value: d.payment_date, label: d.payment_date});
				}
			});
			
			if (options.length === 0) {
				var last_payment = options4[0].value;

			} else {
			if (options[0].value > 1) {
			var last_payment = options[0].value;
			} else {
			var last_payment = options4[0].value;
			}
		}
		if (options2.length === 0) {
			var last_payment_date = options5[0].value;
		} else {
			var last_payment_date = options2[0].value;
		}
		frappe.prompt([
			{fieldname: "setDate", label: __("Next Payment Start Date"), fieldtype: "Date", reqd: 1},
		  ], function (data) {
			var daten = new Date(data.setDate);
			var year = daten.getFullYear();
			var month = daten.getMonth();
			var day = 1;
			var forma = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

			var daten = new Date(last_payment_date);
			var year = daten.getFullYear();
			var month = daten.getMonth();
			var day = 1;
			var fo = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

			if (forma <= fo) {
				frappe.throw(__("Next Payment Start Date should be greater than deducted date of {0}", [last_payment_date]));
			}
			frappe.call({
				method: "custom_loan.Custom.loan.update_additional_salary",
				args: {
					amount: last_payment,
					loan_amount: frm.doc.loan_amount,
					source: frm.doc.name,
					input_amount: last_payment,
					input_date: data.setDate,
					loan: frm.doc.name,
					type: "Deduction Till",
					payment_date: forma
				},
				callback: function(me){
						if (me.message === "pass"){
							frm.refresh_field("repayment_schedule");
						}
				}
			});
			}, __("Set Date for Next Deduction to Start"), __("Update"));
		}
	});
	},
	change_monthly_repayment_amount: (frm) => {
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Custom Loan",
				name: cur_frm.doc.name
			},
			callback: function(r) {
				var options2 = [];
				var options = [];
				$.each(r.message.repayment_schedule, function(i, d) {
					if(d.is_paid === 0 && d.total_payment > 0) {
						options.push({value: d.payment_date, label: d.payment_date});
					}
					if(d.is_paid === 1 && d.total_payment > 0) {
						options2.push({value: d.payment_date, label: d.payment_date});
					}
				});
		
				var last_payment_date = options[options.length - 1].value;
				var first_payment_date4 = options[0].value;
				
				if (options2.length > 0){
					var last_payment_date2 = options2[options2.length - 1].value;
				if (last_payment_date2 > first_payment_date4) {
					last_payment_date = last_payment_date2;
				} else{
					last_payment_date = first_payment_date4;
				}
			} else{
				last_payment_date = first_payment_date4;
			}
			frappe.prompt([
				{fieldname: "amount", label: __("Amount"), fieldtype: "Currency", reqd: 1}
			  ], function (data) {
				var daten = new Date(last_payment_date);
				var year = daten.getFullYear();
				var month = daten.getMonth();
				var day = 1;
				var formattedDaten = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

				frappe.call({
					method: "custom_loan.Custom.loan.update_additional_salary",
					args: {
						amount: data.amount,

						loan_amount: frm.doc.loan_amount,
						source: frm.doc.name,
						input_amount: data.amount,
						input_date: formattedDaten,
						loan: frm.doc.name,
						type: "Monthly Deduction Amount",
						payment_date: formattedDaten
					},
					callback: function(me){
							if (me.message === "pass"){
								frm.refresh_field("repayment_schedule");
							}
					}
				});
			}, __("Change Monthly Repayment Amount"), __("Update"));
		}
	});	
	},

	refresh: function (frm) {
		if (frm.doc.docstatus == 1) {
		let total = 0;
		let table_field = frappe.get_doc("Custom Loan", frm.doc.name).repayment_schedule;

		for (let i = 0; i < table_field.length; i++) {
			if (table_field[i].is_paid) {
				total += table_field[i].total_payment;
			}
		}
		if (frm.doc.total_amount_paid != total) {
		frm.set_value("total_amount_paid", total);
		frm.save("Update");
	}
		if (frm.doc.loan_amount === frm.doc.total_amount_paid && frm.doc.status != "Closed") {
			frm.set_value("status", "Closed");
			frm.save("Update");
		}
	}
		if (frm.doc.repayment_schedule_type == "Pro-rated calendar months") {
			frm.set_df_property("repayment_start_date", "label", "Interest Calculation Start Date");
		}

		if (frm.doc.docstatus == 1) {
			frm.add_custom_button(__('Export to XML'), function() {
				
				frappe.call({
					method: 'custom_loan.custom_loan.doctype.custom_loan.custom_loan.create_xml',
					args: {
						data: frm.doc.name
					},
					callback: function(response) {
						console.log(response.message);
					}
				});

			});
			frm.add_custom_button(__('Export to XML to DB'), function() {
				
				frappe.call({
					method: 'custom_loan.custom_loan.doctype.custom_loan.custom_loan.send_xml_to_server',
					args: {
						data: frm.doc.name
					},
					callback: function(response) {
						console.log(response.message);
					}
				});

			});

			if (["Sanctioned", "Partially Disbursed"].includes(frm.doc.status)) {
				frm.add_custom_button(__('Loan Disbursement Journal Entry'), function() {
					frm.trigger("make_loan_disbursement_journal_entry");
				},__('Create'));
			}

			if (["Disbursed", "Partially Disbursed"].includes(frm.doc.status)) {
				frm.add_custom_button(__('Loan Write Off'), function() {
					frm.trigger("make_loan_write_off_entry");
				},__('Create'));
				frm.add_custom_button(__('Loan Repayment by External Sources'), function() {
					frm.trigger("make_loan_write_off_by_external_sources_entry");
				},__('Create'));
			}

		} 
		frm.trigger("toggle_fields");
	},

	repayment_schedule_type: function(frm) {
		if (frm.doc.repayment_schedule_type == "Pro-rated calendar months") {
			frm.set_df_property("repayment_start_date", "label", "Interest Calculation Start Date");
		} else {
			frm.set_df_property("repayment_start_date", "label", "Repayment Start Date");
		}
	},

	loan_type: function(frm) {
		frm.toggle_reqd("repayment_method", frm.doc.is_term_loan);
		frm.toggle_display("repayment_method", frm.doc.is_term_loan);
		frm.toggle_display("repayment_periods", frm.doc.is_term_loan);
	},

	make_loan_disbursement_journal_entry: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"company": frm.doc.company,
				"ref_date": frm.doc.posting_date,
				"applicant": frm.doc.applicant,
				"applicant_type": frm.doc.applicant_type,
				"loan_application": frm.doc.loan_application,
				"applicant_name": frm.doc.applicant_name,
				"pending_amount": frm.doc.loan_amount - frm.doc.disbursed_amount,
				"debit_account": frm.doc.disbursement_account,
				"credit_account": frm.doc.loan_account,
				"as_dict": 1
			},
			method: "custom_loan.Custom.loan.make_loan_disbursement_journal_entry",
			callback: function(r) {
				if (r.message) {
					var doc = frappe.model.sync(r.message)[0];
					frappe.set_route("Form", doc.doctype, doc.name);
				}
			}
		});
	},

	make_loan_write_off_entry: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"company": frm.doc.company,
				"as_dict": 1
			},
			method: "custom_loan.custom_loan.doctype.custom_loan.custom_loan.make_loan_write_off",
			callback: function (r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},
	make_loan_write_off_by_external_sources_entry: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"company": frm.doc.company,
				"as_dict": 1
			},
			method: "custom_loan.custom_loan.doctype.custom_loan.custom_loan.make_loan_write_off_by_external_sources_entry",
			callback: function (r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},

	request_loan_closure: function(frm) {
		frappe.confirm(__("Do you really want to close this loan"),
			function() {
				frappe.call({
					method: "custom_loan.custom_loan.doctype.custom_loan.custom_loan.request_loan_closure",
					args: {
						"loan": frm.doc.name,
						"loan_amount": frm.doc.loan_amount,
						"total_amount_paid": frm.doc.total_amount_paid
					},
					callback: function() {
						frm.reload_doc();
					}
				});
			}
		);
	},

	loan_application: function (frm) {
		if(frm.doc.loan_application){
			return frappe.call({
				method: "custom_loan.custom_loan.doctype.custom_loan.custom_loan.get_loan_application",
				args: {
					"loan_application": frm.doc.loan_application
				},
				callback: function (r) {
					if (!r.exc && r.message) {

						let loan_fields = ["loan_type", "loan_amount", "repayment_method",
							"monthly_repayment_amount", "repayment_periods", "rate_of_interest", "is_secured_loan"]

						loan_fields.forEach(field => {
							frm.set_value(field, r.message[field]);
						});
                    }
                }
            });
        }
	},

	repayment_method: function (frm) {
		frm.trigger("toggle_fields")
	},

	toggle_fields: function (frm) {
		frm.toggle_enable("monthly_repayment_amount", frm.doc.repayment_method == "Repay Fixed Amount per Period")
		frm.toggle_enable("repayment_periods", frm.doc.repayment_method == "Repay Over Number of Periods")
	}
});
frappe.ui.form.on("Repayment", "is_paid", function(frm) {
	let total = 0;
	let table_field = frappe.get_doc("Custom Loan", frm.doc.name).repayment_schedule;

	for (let i = 0; i < table_field.length; i++) {
		if (table_field[i].is_paid) {
			total += table_field[i].total_payment;
		}
	}
	frm.set_value("total_amount_paid", total);
});
