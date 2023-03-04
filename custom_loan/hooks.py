from . import __version__ as app_version

app_name = "custom_loan"
app_title = "Custom Loan"
app_publisher = "VV Systems Developer"
app_description = "This is a custom loan module to customize how loan is handled"
app_email = "imalinza20@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/custom_loan/css/custom_loan.css"
# app_include_js = "/assets/custom_loan/js/custom_loan.js"

# include js, css files in header of web template
# web_include_css = "/assets/custom_loan/css/custom_loan.css"
# web_include_js = "/assets/custom_loan/js/custom_loan.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "custom_loan/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {"Loan Application" : "public/js/button.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#	"methods": "custom_loan.utils.jinja_methods",
#	"filters": "custom_loan.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "custom_loan.install.before_install"
# after_install = "custom_loan.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "custom_loan.uninstall.before_uninstall"
# after_uninstall = "custom_loan.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "custom_loan.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Journal Entry": {
		"on_submit": "custom_loan.Custom.loan.on_submit",
	},
    "Payroll Entry": {
		"before_submit": "custom_loan.Custom.loan.add_additional_salary"
	},
    "Additional Salary": {
		"before_cancel": "custom_loan.Custom.loan.do_cancell",
	},
    "Salary Slip": {
		"on_submit": "custom_loan.Custom.loan.on_salary_slip_submit",
	},
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
#	"all": [
#		"custom_loan.tasks.all"
#	],
#	"daily": [
#		"custom_loan.tasks.daily"
#	],
#	"hourly": [
#		"custom_loan.tasks.hourly"
#	],
#	"weekly": [
#		"custom_loan.tasks.weekly"
#	],
#	"monthly": [
#		"custom_loan.tasks.monthly"
#	],
# }

# Testing
# -------

# before_tests = "custom_loan.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "custom_loan.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "custom_loan.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

# user_data_fields = [
#	{
#		"doctype": "{doctype_1}",
#		"filter_by": "{filter_by}",
#		"redact_fields": ["{field_1}", "{field_2}"],
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_2}",
#		"filter_by": "{filter_by}",
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_3}",
#		"strict": False,
#	},
#	{
#		"doctype": "{doctype_4}"
#	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#	"custom_loan.auth.validate"
# ]
