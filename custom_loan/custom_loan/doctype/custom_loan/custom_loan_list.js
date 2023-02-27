
frappe.listview_settings['Custom Loan'] = {
	get_indicator: function(doc) {
		var status_color = {
			"Draft": "red",
			"Sanctioned": "blue",
			"Disbursed": "orange",
			"Partially Disbursed": "yellow",
			"Loan Closure Requested": "green",
			"Closed": "green"
		};
		return [__(doc.status), status_color[doc.status], "status,=,"+doc.status];
	},
};
