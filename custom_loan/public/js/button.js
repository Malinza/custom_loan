{% include 'erpnext/loan_management/loan_common.js' %};

frappe.ui.form.on('Loan Application', {

	add_toolbar_buttons: function(frm) {
		if (frm.doc.status == "Approved") {
			frappe.db.get_value("Custom Loan", {"loan_application": frm.doc.name, "docstatus": 1}, "name", (r) => {
				if (Object.keys(r).length === 0) {
					frm.add_custom_button(__('Staff Loans'), function() {
						frm.trigger('create_loans');
					},__('Create'))
				} else {
					frm.set_df_property('status', 'read_only', 1);
				}
			});
		}
	},
	create_loans: function(frm) {
		if (frm.doc.status != "Approved") {
			frappe.throw(__("Cannot create loan until application is approved"));
		}

		frappe.model.open_mapped_doc({
			method: 'custom_loan.Custom.button_method.create_loans',
			frm: frm
		});
	}
});