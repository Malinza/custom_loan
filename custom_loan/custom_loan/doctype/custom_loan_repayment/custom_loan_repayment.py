# Copyright (c) 2023, VV Systems Developer and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from dateutil.relativedelta import relativedelta

from frappe import _
from frappe.utils import cint, flt
from datetime import datetime, timedelta, date

class CustomLoanRepayment(Document):
	def before_save(self):
		self.set_missing_values()
		self.validate_amount()
		
	def on_submit(self):
		self.reschedule_repayment_schedule()
		if self.repayment_type == "Loan Write Off":
			self.update_outstanding_amount()
		elif self.repayment_type == "External Sources":
			self.update_outstanding_amount2()

	def on_cancel(self):
		self.cancel_reschedule_repayment_schedule()
		if self.repayment_type == "Loan Write Off":
			self.update_outstanding_amount(cancel=1)
		elif self.repayment_type == "External Sources":
			self.update_outstanding_amount2(cancel=1)

	def update_outstanding_amount(self, cancel=0):
		written_off_amount = frappe.db.get_value("Custom Loan", self.loan, "written_off_amount")
		total_amount_paid = frappe.db.get_value("Custom Loan", self.loan, "total_amount_paid")

		if cancel:
			written_off_amount -= self.write_off_amount
			total_amount_paid -= self.write_off_amount
		else:
			written_off_amount += self.write_off_amount
			total_amount_paid += self.write_off_amount

		frappe.db.set_value("Custom Loan", self.loan, "written_off_amount", written_off_amount)
		frappe.db.set_value("Custom Loan", self.loan, "total_amount_paid", total_amount_paid)

	def update_outstanding_amount2(self, cancel=0):
		rep_amount = frappe.db.get_value("Custom Loan", self.loan, "total_amount_paid")

		if cancel:
			rep_amount -= self.repayment_amount
		else:
			rep_amount += self.repayment_amount

		frappe.db.set_value("Custom Loan", self.loan, "total_amount_paid", rep_amount)

	def validate_amount(self):
		precision = cint(frappe.db.get_default("currency_precision")) or 2
		total_payment, total_amount_paid = frappe.get_value("Custom Loan",self.loan,["total_payment", "total_amount_paid"],)

		pending_amount = flt(
			flt(total_payment) - flt(total_amount_paid),
			precision,
			)
		if self.repayment_type == "Loan Write Off":
			if self.write_off_amount > pending_amount:
				frappe.throw(_("Write off amount cannot be greater than pending loan amount"))
		elif self.repayment_type == "External Sources":
			if self.repayment_amount > pending_amount:
				frappe.throw(_("Repayment amount cannot be greater than pending loan amount"))

	def set_missing_values(self):
		if self.repayment_type == "Loan Write Off":
			self.repayment_amount = 0
			self.repayment_account = ""
			self.description = ""
		elif self.repayment_type == "External Sources":
			self.write_off_amount = 0
			self.write_off = ""

	def reschedule_repayment_schedule(self):
		custom_loan = frappe.get_doc("Custom Loan", self.loan)
		options = []
		for d in custom_loan.repayment_schedule:
			if d.is_paid == 1:
				options.append({'value': d.payment_date, 'label': d.payment_date})
		if len(options) == 0:
			last_payment_date = self.payment_date
		else:
			last_payment_date = options[-1]['value']
			last_payment_date = last_payment_date + relativedelta(months=1)
			last_payment_date = last_payment_date.replace(day=1)
			last_payment_date = datetime.strftime(last_payment_date, "%Y-%m-%d")

		if self.repayment_type == "External Sources":
			repayment_amount = self.repayment_amount
		elif self.repayment_type == "Loan Write Off":
			repayment_amount = self.write_off_amount

		loan_amount = custom_loan.loan_amount - custom_loan.total_amount_paid
		monthly_repayment_amount = custom_loan.monthly_repayment_amount
		loan_amount -= repayment_amount

		repayment_schedule = []
		payment_counter = 0

		while loan_amount > 0:
			payment = {}
			payment_date = datetime.strptime(last_payment_date, "%Y-%m-%d")
			next_month = payment_date + relativedelta(months=1)
			payment["payment_date"] = next_month.replace(day=1)
			payment["payment_date"] = payment["payment_date"] + relativedelta(months=1 * payment_counter)
			payment["principal_amount"] = min(loan_amount, monthly_repayment_amount)
			payment["total_payment"] = payment["principal_amount"]
			loan_amount -= payment["principal_amount"]
			payment["balance_loan_amount"] = loan_amount
			repayment_schedule.append(payment)

			payment_counter += 1

		to_remove = []
		for d in custom_loan.repayment_schedule:
			if d.is_paid == 0:
				to_remove.append(d)
		for d in to_remove:
			custom_loan.remove(d)
		for i, d in enumerate(custom_loan.repayment_schedule):
			d.idx = i + 1

		# for d in custom_loan.repayment_schedule:
		# 	if not d.is_paid:
		# 		custom_loan.repayment_schedule.remove(d)
		loan_amountt = custom_loan.loan_amount - custom_loan.total_amount_paid
		loan_amountt -= repayment_amount
		
		# custom_loan.repayment_schedule = []
		payment_dt = datetime.strptime(last_payment_date, "%Y-%m-%d")
		payment_dt = payment_dt.replace(day=1)
		custom_loan.append("repayment_schedule", {
			"payment_date": payment_dt.strftime("%Y-%m-%d"),
			"principal_amount": 0,
			"total_payment": repayment_amount,
			"balance_loan_amount": loan_amountt,
			"is_paid": 1
		})
		# custom_loan.save()

		for d in repayment_schedule:
			payment_date = d["payment_date"]
			payment_datee = payment_date.replace(day=1)
			custom_loan.append("repayment_schedule", {
				"payment_date": payment_datee.strftime("%Y-%m-%d"),
				"principal_amount": 0,
				"total_payment": d["total_payment"],
				"balance_loan_amount": d["balance_loan_amount"],
				"is_paid": 0
			})
		
		custom_loan.save()

	def cancel_reschedule_repayment_schedule(self):
		custom_loan = frappe.get_doc("Custom Loan", self.loan)
		options = []
		options2 = []
		options4 = []
		options5 = []

		payment_d = self.payment_date
		first_day_of_month = payment_d.replace(day=1)

		for d in custom_loan.repayment_schedule:
			if d.is_paid == 1 and d.payment_date > first_day_of_month:
				options.append({'value': d.total_payment, 'label': d.total_payment})
				options2.append({'value': d.payment_date, 'label': d.payment_date})
			if d.is_paid == 1 and d.payment_date < first_day_of_month:
				options4.append({'value': d.total_payment, 'label': d.total_payment})
				options5.append({'value': d.payment_date, 'label': d.payment_date})

		# prev_month = payment_date.replace(day=1) - timedelta(days=1)
		# first_day_prev_month = prev_month.replace(day=1)
		# print("First day of previous month:", first_day_prev_month.strftime("%Y-%m-%d"))
		if len(options) > 0:
			last_payment_date = options2[-1]['value']
			last_payment_date = last_payment_date + relativedelta(months=1)
			last_payment_date = last_payment_date.replace(day=1)
			# options[-1]["value"]
		else:
			if len(options5) > 0:
				last_payment_date = options5[-1]['value']
				last_payment_date = last_payment_date + relativedelta(months=1)
				last_payment_date = last_payment_date.replace(day=1)
			else:
				last_payment_date = first_day_of_month
			
		if self.repayment_type == "External Sources":
			repayment_amount = self.repayment_amount
		elif self.repayment_type == "Loan Write Off":
			repayment_amount = self.write_off_amount

		loan_amount = custom_loan.loan_amount - custom_loan.total_amount_paid
		monthly_repayment_amount = custom_loan.monthly_repayment_amount
		loan_amount += repayment_amount

		repayment_schedule = []
		payment_counter = 0

		while loan_amount > 0:
			payment = {}
			payment_date = last_payment_date
			# next_month = payment_date + relativedelta(months=1)
			payment["payment_date"] = payment_date.replace(day=1)
			payment["payment_date"] = payment["payment_date"] + relativedelta(months=1 * payment_counter)
			payment["principal_amount"] = min(loan_amount, monthly_repayment_amount)
			payment["total_payment"] = payment["principal_amount"]
			loan_amount -= payment["principal_amount"]
			payment["balance_loan_amount"] = loan_amount
			repayment_schedule.append(payment)

			payment_counter += 1

		to_remove = []
		for d in custom_loan.repayment_schedule:
			if d.is_paid == 0 or d.payment_date == first_day_of_month:
				to_remove.append(d)

		for d in to_remove:
			custom_loan.remove(d)

		# loan_amounts = custom_loan.loan_amount
		# for d in to_add:
		# 	loan_amounts -= d.total_payment
		# 	custom_loan.append("repayment_schedule", {
		# 		"payment_date": d.payment_date,
		# 		"principal_amount": d.principal_amount,
		# 		"total_payment": d.total_payment,
		# 		"balance_loan_amount": loan_amounts

		# 	})
		for i, d in enumerate(custom_loan.repayment_schedule):
			d.idx = i + 1

		# for d in custom_loan.repayment_schedule:
		# 	if not d.is_paid:
		# 		custom_loan.repayment_schedule.remove(d)
		# loan_amountt = custom_loan.loan_amount - custom_loan.total_amount_paid
		# loan_amountt -= repayment_amount
		
		# # custom_loan.repayment_schedule = [] # very dangerous code but may come in handy
		# payment_date = datetime.strptime(self.payment_date, "%Y-%m-%d").date()
		# payment_date = payment_date.replace(day=1)
		# custom_loan.append("repayment_schedule", {
		# 	"payment_date": payment_date.strftime("%Y-%m-%d"),
		# 	"principal_amount": 0,
		# 	"total_payment": repayment_amount,
		# 	"balance_loan_amount": loan_amountt,
		# 	"is_paid": 1
		# })
		# custom_loan.save()

		for d in repayment_schedule:
			custom_loan.append("repayment_schedule", {
				"payment_date": d["payment_date"],
				"principal_amount": d["principal_amount"],
				"total_payment": d["total_payment"],
				"balance_loan_amount": d["balance_loan_amount"]
			})
		
		custom_loan.save()