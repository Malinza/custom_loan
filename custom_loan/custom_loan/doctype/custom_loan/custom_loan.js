// Copyright (c) 2023, VV Systems Developer and contributors
// For license information, please see license.txt

{% include 'erpnext/loan_management/loan_common.js' %};

frappe.ui.form.on("Custom Loan", {
	setup: function(frm) {
		frm.make_methods = {
			'Loan Disbursement': function() { frm.trigger('make_loan_disbursement') },
			'Loan Security Unpledge': function() { frm.trigger('create_loan_security_unpledge') },
			'Loan Write Off': function() { frm.trigger('make_loan_write_off_entry') }
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

	refresh: function (frm) {
		$(function() {
		$('button[data-fieldname="deduction_till"]').click(function() {
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
				var last_payment_date = options2[0].value;
			frappe.prompt([
				{fieldname: "setDate", label: __("Next Payment Start Date"), fieldtype: "Date", reqd: 1},
			  ], function (data) {
				var dt = new Date(data.setDate);
				var st = new Date(dt.getFullYear(), dt.getMonth(), 1);
				var le = new Date(last_payment_date);
				var dst = new Date(le.getFullYear(), le.getMonth(), 1);

				var daten = new Date(st);
				var year = daten.getFullYear();
				var month = daten.getMonth() + 1;
				var day = 1;
				var forma = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
	
				var daten = new Date(dst);
				var year = daten.getFullYear();
				var month = daten.getMonth() + 1;
				var day = 1;
				var fo = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');

				if (forma <= fo) {
					frappe.throw(__("Next Payment Start Date should be greater than deducted date of {0}", [last_payment_date]));
				}
				var setDate = data.setDate;
				var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				var monthlyRepaymentAmount = last_payment;
	
				var repaymentSchedule = [];
				
				var paymentCounter = 0;
	
				while (loanAmount > 0) {
					var payment = {};
					var dt = new Date(setDate);
					payment.paymentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
					payment.paymentDate.setMonth(payment.paymentDate.getMonth() + paymentCounter);
					payment.principalAmount = Math.min(loanAmount, monthlyRepaymentAmount);
					payment.totalPayment = payment.principalAmount;
					loanAmount -= payment.principalAmount;
					payment.balanceLoanAmount = loanAmount;
					repaymentSchedule.push(payment);
					
					paymentCounter++;
				}
				var childTable = frm.doc.repayment_schedule;
				for (var i = childTable.length - 1; i >= 0; i--) {
				  if (!childTable[i].is_paid) {
					frm.doc.repayment_schedule.splice(i, 1);
				  }
				}
					for (const d of repaymentSchedule) {
						var daten = new Date(d.paymentDate);
						var year = daten.getFullYear();
						var month = daten.getMonth() + 1;
						var day = 1;
						var formattedDate = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
					let row = frm.add_child("repayment_schedule", {
					  payment_date: formattedDate,
					  principal_amount: d.principalAmount,
					  total_payment: d.totalPayment,
					  balance_loan_amount: d.balanceLoanAmount
					});
					}
					frm.refresh_field("repayment_schedule");
					frm.save('Update');
				}, __("Set Date for Next Deduction to Start"), __("Update"));
			}
		});	
		});
	});
		$(function() {
		$('button[data-fieldname="change_monthly_repayment_amount"]').click(function() {
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
						if(d.is_paid === 0 && d.total_payment === 0) {
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
				var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				var monthlyRepaymentAmount = data.amount;
	
				var repaymentSchedule = [];
				
				var paymentCounter = 0;
	
				while (loanAmount > 0) {
					var payment = {};
					var dt = new Date(last_payment_date);
					payment.paymentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
					payment.paymentDate.setMonth(payment.paymentDate.getMonth() + paymentCounter);
					payment.principalAmount = Math.min(loanAmount, monthlyRepaymentAmount);
					payment.totalPayment = payment.principalAmount;
					loanAmount -= payment.principalAmount;
					payment.balanceLoanAmount = loanAmount;
					repaymentSchedule.push(payment);
					
					paymentCounter++;
				}
				var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				loanAmount = loanAmount - data.amount;
				var childTable = frm.doc.repayment_schedule;
				for (var i = childTable.length - 1; i >= 0; i--) {
				  if (!childTable[i].is_paid) {
					frm.doc.repayment_schedule.splice(i, 1);
				  }
				}
					for (const d of repaymentSchedule) {
						var daten = new Date(d.paymentDate);
						var year = daten.getFullYear();
						var month = daten.getMonth() + 1;
						var day = 1;
						var formattedDate = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
					let row = frm.add_child("repayment_schedule", {
					  payment_date: formattedDate,
					  principal_amount: d.principalAmount,
					  total_payment: d.totalPayment,
					  balance_loan_amount: d.balanceLoanAmount
					});
					}
					frm.refresh_field("repayment_schedule");
					frm.save('Update');
				}, __("Change Monthly Repayment Amount"), __("Update"));
			}
		});	
		});
	});
		$(function() {
		$('button[data-fieldname="deduct_amount"]').click(function() {
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
				var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				var monthlyRepaymentAmount = frm.doc.monthly_repayment_amount;
				loanAmount = loanAmount - data.amount;
	
				var repaymentSchedule = [];
				
				var paymentCounter = 0;
	
				while (loanAmount > 0) {
					var payment = {};
					var dt = new Date(data.payment_date);
					var nextMonth = new Date();
					payment.paymentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
					nextMonth.setMonth(dt.getMonth() + 1);
					payment.paymentDate.setMonth(nextMonth.getMonth() + paymentCounter);
					payment.principalAmount = Math.min(loanAmount, monthlyRepaymentAmount);
					payment.totalPayment = payment.principalAmount;
					loanAmount -= payment.principalAmount;
					payment.balanceLoanAmount = loanAmount;
					repaymentSchedule.push(payment);
					
					paymentCounter++;
				}
				var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				loanAmount = loanAmount - data.amount;
				var childTable = frm.doc.repayment_schedule;
				for (var i = childTable.length - 1; i >= 0; i--) {
				  if (!childTable[i].is_paid) {
					frm.doc.repayment_schedule.splice(i, 1);
				  }
				}
					var daten = new Date(data.payment_date);
						var year = daten.getFullYear();
						var month = daten.getMonth() + 1;
						var day = 1;
						var formattedDaten = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
					let rows = frm.add_child("repayment_schedule", {
						payment_date: formattedDaten,
						principal_amount: "0",
						total_payment: data.amount,
						balance_loan_amount: loanAmount,
						is_paid: 0
					  });
					for (const d of repaymentSchedule) {
						var daten = new Date(d.paymentDate);
						var year = daten.getFullYear();
						var month = daten.getMonth() + 1;
						var day = 1;
						var formattedDate = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
					let row = frm.add_child("repayment_schedule", {
					  payment_date: formattedDate,
					  principal_amount: d.principalAmount,
					  total_payment: d.totalPayment,
					  balance_loan_amount: d.balanceLoanAmount
					});
					}
					frm.refresh_field("repayment_schedule");
					frm.save('Update');
				}, __("Change Deduction Amount for a Chosen Period"), __("Update"));
			}
		});	
		});
	});
		let total = 0;
		let table_field = frappe.get_doc("Custom Loan", frm.doc.name).repayment_schedule;

		for (let i = 0; i < table_field.length; i++) {
			if (table_field[i].is_paid) {
				total += table_field[i].total_payment;
			}
		}
		frm.set_value("total_amount_paid", total);
		$(function() {
		$('button[data-fieldname="dont_deduct_this_month"]').click(function() {
			frappe.call({
				method: "frappe.client.get",
				args: {
				doctype: "Custom Loan",
				name: frm.doc.name
				},
				callback: function(r) {
				var options = [];
				var options2 = [];
				var options3 = [];
				var options4 = [];
				var options5 = [];
				$.each(r.message.repayment_schedule, function(i, d) {
				if(d.is_paid === 0 && d.total_payment > 0) {
				options.push({value: d.payment_date, label: d.payment_date});
				options2.push({value: d.total_payment, label: d.total_payment});
				}
				if(d.is_paid === 1 && d.total_payment > 0) {
					options3.push({value: d.payment_date, label: d.payment_date});
					options4.push({value: d.total_payment, label: d.total_payment});
					}
					options5.push({date: d.payment_date, amount: d.total_payment});
				});
				frappe.prompt([
					{fieldname: "payment_date", label: __("Date which is not to deduct"), fieldtype: "Select", options: options, reqd: 1},
				  ], function (data) {

					if(options2[0].value > 1){
						var amount = options2[0].value;
					}else{
						var amount = options4[0].value;
					}

					let totalAmount = 0;
					for (let i = 0; i < options5.length; i++) {
					if (options5[i].date < data.payment_date) {
						totalAmount += options5[i].amount;
					}
					}
					console.log("Total amount:", totalAmount);

					var loanAmount = frm.doc.loan_amount - frm.doc.total_amount_paid;
				var monthlyRepaymentAmount = amount;
	
				var repaymentSchedule = [];
				
				var paymentCounter = 0;
				loanAmount -= totalAmount;
	
				while (loanAmount > 0) {
					var payment = {};
					var dt = new Date(data.payment_date);
					var nextMonth = new Date();
					payment.paymentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
					nextMonth.setMonth(dt.getMonth() + 1);
					payment.paymentDate.setMonth(nextMonth.getMonth() + paymentCounter);
					payment.principalAmount = Math.min(loanAmount, monthlyRepaymentAmount);
					payment.totalPayment = payment.principalAmount;
					loanAmount -= payment.principalAmount;
					payment.balanceLoanAmount = loanAmount;
					repaymentSchedule.push(payment);
					
					paymentCounter++;
				}
				var childTable = frm.doc.repayment_schedule;
				var daten = new Date(data.payment_date);
					var year = daten.getFullYear();
					var month = daten.getMonth() + 1;
					var day = 1;
					var formattedDaten = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
				for (var i = childTable.length - 1; i >= 0; i--) {
					if (!childTable[i].is_paid && childTable[i].payment_date > formattedDaten) {
						frm.doc.repayment_schedule.splice(i, 1);
					  }
					  
				}
				var childTable = frm.doc.repayment_schedule;
				for (var i = childTable.length - 1; i >= 0; i--) {
					
				if (childTable[i].payment_date === formattedDaten) {
					childTable[i].total_payment = 0;
					childTable[i].is_paid = 0;
					childTable[i].balance_loan_amount = loanAmount;
				  }  
				}
					for (const d of repaymentSchedule) {
						var daten = new Date(d.paymentDate);
						var year = daten.getFullYear();
						var month = daten.getMonth() + 1;
						var childTable = frm.doc.repayment_schedule;
						for (var i = childTable.length - 1; i >= 0; i--) {
							if (childTable[i].payment_date === d.paymentDate && childTable[i].total_payment === 0) {
								childTable[i].balance_loan_amount = d.balanceLoanAmount;
								month += 1;
								if (month > 12) {
								month = 1;
								year += 1;
								}
							}
						}
								var day = 1;
								var formattedDate = [year, month.toString().padStart(2, '0'), day.toString().padStart(2, '0')].join('-');
								let row = frm.add_child("repayment_schedule", {
									payment_date: formattedDate,
									principal_amount: d.principalAmount,
									total_payment: d.totalPayment,
									balance_loan_amount: d.balanceLoanAmount
									});
								}
					frm.refresh_field("repayment_schedule");
					frm.save('Update');
				}, __("Choose a Certain Period not to deduct"), __("Update"));
			}
		});
		});
	});

		$('button[data-fieldname="change_months_paid"]').click(function() {
			// var field = frm.get_field('repayment_periods');
			// field.df.read_only = 0;
			// field.refresh();
			frappe.prompt([
				{fieldname: "payment_period", label: __("Repayment Period in Months"), fieldtype: "Int"}
			  ], function (data) {
				frappe.call({
					method: "custom_loan.custom_loan.doctype.custom_loan.custom_loan.get_monthly_repayment_amount",
					args: {
						"loan_amount": frm.doc.loan_amount, 
						"rate_of_interest": null,
						"repayment_periods": data.payment_period

					},
					callback: function (r) {
						if (r.message)
							frm.doc.repayment_periods = data.payment_period;
							frm.doc.monthly_repayment_amount = r.message;
							frm.refresh_fields();
							frm.set_df_property("repayment_periods", "read_only", 1);
							
							// Define the loan variables
							var loanAmount = frm.doc.loan_amount;
							var numberOfPayments = frm.doc.repayment_periods;

							// Calculate the monthly payment
							var monthlyPayment = loanAmount / numberOfPayments;

							// Create an array to hold the repayment schedule
							var repaymentSchedule = [];

							// Populate the repayment schedule array
							for (var i = 0; i < numberOfPayments; i++) {
							var payment = {};
							var dt = new Date(frm.doc.repayment_start_date);
							payment.paymentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
							payment.paymentDate.setMonth(payment.paymentDate.getMonth() + i);
							payment.principalAmount = monthlyPayment;
							payment.totalPayment = monthlyPayment;
							loanAmount -= payment.principalAmount;
							payment.balanceLoanAmount = loanAmount;
							repaymentSchedule.push(payment);
							}

							// Populate the repayment schedule table which is a child table
							frm.clear_table("repayment_schedule");
							for (const d of repaymentSchedule) {
							let row = frm.add_child("repayment_schedule", {
								payment_date: d.paymentDate,
								principal_amount: d.principalAmount,
								total_payment: d.totalPayment,
								balance_loan_amount: d.balanceLoanAmount
							});
							}
							frm.refresh_field("repayment_schedule");
							frm.save('Update');
					}
				});
			  }, __("Change Repayment Period"), __("Update"));
		  });

		// var childTable = frm.doc.repayment_schedule;
		// var dt = new Date();
		// var pd = new Date(dt.getFullYear(), dt.getMonth(), 1);
		// for (var i = childTable.length - 1; i >= 0; i--) {
		// 	if (childTable[i].is_paid && new Date(childTable[i].payment_date).toDateString() === pd.toDateString()) {
		// 	frm.set_df_property("dont_deduct_this_month", "hidden", 1);
		// 	frm.refresh_fields();
		// 	}else{
		// 	frm.set_df_property("dont_deduct_this_month", "hidden", 0);
		// 	frm.refresh_fields();	
		// 	}
		// }  
		if (frm.doc.repayment_schedule_type == "Pro-rated calendar months") {
			frm.set_df_property("repayment_start_date", "label", "Interest Calculation Start Date");
		}

		if (frm.doc.docstatus == 1) {
			frm.set_df_property("dont_deduct_this_month", "hidden", 0);
			frm.set_df_property("deduct_amount", "hidden", 0);
			frm.set_df_property("change_monthly_repayment_amount", "hidden", 0);
			frm.set_df_property("deduction_till", "hidden", 0);
			frm.refresh_fields();
			if (["Disbursed", "Partially Disbursed"].includes(frm.doc.status) && (!frm.doc.repay_from_salary)) {
				frm.add_custom_button(__('Request Loan Closure'), function() {
					frm.trigger("request_loan_closure");
				},__('Status'));

				frm.add_custom_button(__('Loan Repayment'), function() {
					frm.trigger("make_repayment_entry");
				},__('Create'));
			}

			if (["Sanctioned", "Partially Disbursed"].includes(frm.doc.status)) {
				frm.add_custom_button(__('Loan Disbursement Journal Entry'), function() {
					frm.trigger("make_loan_disbursement_journal_entry");
				},__('Create'));
			}

			if (frm.doc.status == "Loan Closure Requested") {
				frm.add_custom_button(__('Loan Security Unpledge'), function() {
					frm.trigger("create_loan_security_unpledge");
				},__('Create'));
			}

			if (["Loan Closure Requested", "Disbursed", "Partially Disbursed"].includes(frm.doc.status)) {
				frm.add_custom_button(__('Loan Write Off'), function() {
					frm.trigger("make_loan_write_off_entry");
				},__('Create'));

				frm.add_custom_button(__('Loan Refund'), function() {
					frm.trigger("make_loan_refund");
				},__('Create'));
			}

			if (frm.doc.status == "Loan Closure Requested" && frm.doc.is_term_loan && !frm.doc.is_secured_loan) {
				frm.add_custom_button(__('Close Loan'), function() {
					frm.trigger("close_unsecured_term_loan");
				},__('Status'));
			}
		} else {
			frm.set_df_property("dont_deduct_this_month", "hidden", 1);
			frm.set_df_property("deduct_amount", "hidden", 1);
			frm.set_df_property("deduct_amount", "hidden", 1);
			frm.set_df_property("change_monthly_repayment_amount", "hidden", 1);
			frm.set_df_property("deduction_till", "hidden", 1);
			frm.refresh_fields();
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

	make_loan_disbursement: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"company": frm.doc.company,
				"applicant_type": frm.doc.applicant_type,
				"applicant": frm.doc.applicant,
				"pending_amount": frm.doc.loan_amount - frm.doc.disbursed_amount > 0 ?
					frm.doc.loan_amount - frm.doc.disbursed_amount : 0,
				"as_dict": 1
			},
			method: "erpnext.loan_management.doctype.loan.loan.make_loan_disbursement",
			callback: function (r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},

	make_repayment_entry: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"applicant_type": frm.doc.applicant_type,
				"applicant": frm.doc.applicant,
				"loan_type": frm.doc.loan_type,
				"company": frm.doc.company,
				"as_dict": 1
			},
			method: "erpnext.loan_management.doctype.loan.loan.make_repayment_entry",
			callback: function (r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},

	make_loan_write_off_entry: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name,
				"company": frm.doc.company,
				"as_dict": 1
			},
			method: "erpnext.loan_management.doctype.loan.loan.make_loan_write_off",
			callback: function (r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},

	make_loan_refund: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name
			},
			method: "erpnext.loan_management.doctype.loan.loan.make_refund_jv",
			callback: function (r) {
				if (r.message) {
					let doc = frappe.model.sync(r.message)[0];
					frappe.set_route("Form", doc.doctype, doc.name);
				}
			}
		})
	},

	close_unsecured_term_loan: function(frm) {
		frappe.call({
			args: {
				"loan": frm.doc.name
			},
			method: "erpnext.loan_management.doctype.loan.loan.close_unsecured_term_loan",
			callback: function () {
				frm.refresh();
			}
		})
	},

	request_loan_closure: function(frm) {
		frappe.confirm(__("Do you really want to close this loan"),
			function() {
				frappe.call({
					args: {
						'loan': frm.doc.name
					},
					method: "erpnext.loan_management.doctype.loan.loan.request_loan_closure",
					callback: function() {
						frm.reload_doc();
					}
				});
			}
		);
	},

	create_loan_security_unpledge: function(frm) {
		frappe.call({
			method: "erpnext.loan_management.doctype.loan.loan.unpledge_security",
			args : {
				"loan": frm.doc.name,
				"as_dict": 1
			},
			callback: function(r) {
				if (r.message)
					var doc = frappe.model.sync(r.message)[0];
				frappe.set_route("Form", doc.doctype, doc.name);
			}
		})
	},

	loan_application: function (frm) {
		if(frm.doc.loan_application){
			return frappe.call({
				method: "erpnext.loan_management.doctype.loan.loan.get_loan_application",
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

						if (frm.doc.is_secured_loan) {
							$.each(r.message.proposed_pledges, function(i, d) {
								let row = frm.add_child("securities");
								row.loan_security = d.loan_security;
								row.qty = d.qty;
								row.loan_security_price = d.loan_security_price;
								row.amount = d.amount;
								row.haircut = d.haircut;
							});

							frm.refresh_fields("securities");
						}
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
