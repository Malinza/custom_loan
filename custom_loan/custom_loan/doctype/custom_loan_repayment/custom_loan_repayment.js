// Copyright (c) 2023, VV Systems Developer and contributors
// For license information, please see license.txt

frappe.ui.form.on('Custom Loan Repayment', {
	loan: function(frm) {
		frm.trigger('show_pending_amount');
	},
	onload: function(frm) {
		frm.trigger('show_pending_amount');
	},
	refresh: function(frm) {
		frm.set_query('write_off_account', function(){
			return {
				filters: {
					'company': frm.doc.company,
					'root_type': 'Expense',
					'is_group': 0
				}
			}
		});
		frm.set_query('repayment_account', function(){
			return {
				filters: {
					'company': frm.doc.company,
					'root_type': 'Asset',
					'is_group': 0
				}
			}
		});
		frm.set_query('loan', function(){
			return {
				filters: {
					'docstatus': 1,
					'status': 'Disbursed'
				}
			}
		});

	},
	show_pending_amount: function(frm) {
		if (frm.doc.loan && frm.doc.docstatus === 0) {
			frappe.db.get_value('Custom Loan', frm.doc.loan, ['total_payment','total_amount_paid', ], function(values) {
				frappe.db.get_value('Company', frm.doc.company, 'default_currency', function(currency) {
					var pending_amount = flt(values.total_payment - values.total_amount_paid, 2);
					var formatted_amount = pending_amount.toLocaleString(undefined, { style: 'currency', currency: currency.default_currency });
					frm.set_df_property('write_off_amount', 'description', "Pending loan amount is " + formatted_amount);
					frm.refresh_field('write_off_amount');
					frm.set_df_property('repayment_amount', 'description', "Pending loan amount is " + formatted_amount);
					frm.refresh_field('repayment_amount');
				});
			});
		}
	}
});
