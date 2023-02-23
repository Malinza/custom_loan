import frappe
from frappe.model.mapper import get_mapped_doc
from frappe.utils import nowdate
from datetime import datetime

@frappe.whitelist()
def make_loan_disbursement_journal_entry(loan, company,applicant,debit_account,applicant_type,credit_account, ref_date, pending_amount, as_dict=0):
    disbursement_entry = frappe.new_doc("Journal Entry")
    disbursement_entry.voucher_type = "Journal Entry"
    disbursement_entry.company = company
    disbursement_entry.posting_date = nowdate()
    disbursement_entry.cheque_no = loan
    disbursement_entry.cheque_date = ref_date

    # create a new item in the table
    new_item = disbursement_entry.append('accounts', {})

    # set the values for the item
    new_item.account = debit_account
    new_item.party_type = applicant_type
    new_item.party = applicant
    new_item.debit_in_account_currency = pending_amount
    new_item.credit_in_account_currency = 0

    disbursement_entry.append("accounts", {
        "account": credit_account,
        "debit_in_account_currency": 0,
        "credit_in_account_currency": pending_amount
    })
    
    disbursement_entry.disbursed_amount = pending_amount
    disbursement_entry.insert()
    if as_dict:
        return disbursement_entry.as_dict()
    else:
        return disbursement_entry

@frappe.whitelist()
def on_submit(doc, method):
    if frappe.db.exists ("Custom Loan", doc.cheque_no):
        cs_loan = frappe.get_doc("Custom Loan", doc.cheque_no)
        if cs_loan.loan_amount == doc.total_debit:
            cs_loan.status = "Disbursed"
            cs_loan.disbursement_date = doc.posting_date
            cs_loan.disbursed_amount = doc.total_debit
            cs_loan.save()
        else:
            frappe.throw("Disbursed amount is not equal to loan amount")

@frappe.whitelist()
def add_additional_salary(doc, method):
    default_company = frappe.defaults.get_global_default("company")
    default_companyy = frappe.get_doc("Company", default_company)
    default_company_abbr = default_companyy.abbr

        # Check if the "Loans and Advances (Assets)" parent account exists
    if not frappe.db.exists("Account", "Loans and Advances (Assets) - " + default_company_abbr):
            # If it doesn't exist, create it with default values
        loans_and_advances = frappe.new_doc("Account")
        loans_and_advances.update({
            "account_name": "Loans and Advances (Assets) - " + default_company_abbr,
            "parent_account": "Current Assets - " + default_company_abbr,
            "root_type": "Asset",
            "company": default_company,
            "is_group": 1
        })
        loans_and_advances.insert()
        loans_and_advances = frappe.get_doc("Account", "Loans and Advances (Assets) - " + default_company_abbr)
    else:
        loans_and_advances = frappe.get_doc("Account", "Loans and Advances (Assets) - " + default_company_abbr)

        # Check if the "Staff Loan" account already exists
    if not frappe.db.exists("Account", "Staff Loan - " + default_company_abbr):
            # If it doesn't exist, create it with default values and "Loans and Advances (Assets)" as the parent
        staff_loan_account = frappe.new_doc("Account")
        staff_loan_account.update({
            "account_name": "Staff Loan",
            "parent_account": loans_and_advances.name,
            "root_type": loans_and_advances.root_type,
            "account_type": "Asset",
            "company": default_company
        })
        staff_loan_account.insert()
        # Check if the "Staff Loan" Salary Component already exists
    if not frappe.db.exists("Salary Component", "Staff Loan"):
            # Create a new "Staff Loan" Salary Component with the desired values
        staff_loan_component = frappe.new_doc("Salary Component")
        staff_loan_component.salary_component = "Staff Loan"
        staff_loan_component.salary_component_type = "Deduction"
        staff_loan_component.payroll_frequency = "Monthly"
        staff_loan_component.amount_based_on_formula = 0
        staff_loan_component.insert()
        staff_loan_component = frappe.get_doc("Salary Component", "Staff Loan")
    else:
        staff_loan_component = frappe.get_doc("Salary Component", "Staff Loan")
        # Check if the document is being submitted
    for i in doc.employees:
            # Check if the "Custom Loan" document already exists
        if frappe.db.exists("Custom Loan", {"applicant": i.employee, "status": "Disbursed"}):
                # If it does, get the document
            # frappe.msgprint("Custom Loan document found {0}". format(i.employee))
            custom_loan = frappe.get_list("Custom Loan", filters={
                "applicant": i.employee, 
                "status": "Disbursed"
                },fields={"name"})
            for loans in custom_loan:
                # Get Repayment Schedule Amount
                new_checkk = datetime.strptime(doc.start_date, "%Y-%m-%d").date()
                # frappe.msgprint("Date is {0}". format(new_checkk))
                new_check = new_checkk.replace(day=1)
                repayment_amount = 0
                custom_loann = frappe.get_doc("Custom Loan", loans)
                for d in custom_loann.repayment_schedule:
                    # frappe.msgprint("Payment Date {0}". format(d.payment_date))
                    if d.payment_date == new_check and d.total_payment > 0 and d.is_paid == 0:
                        repayment_amount = d.total_payment
                        # if not frappe.db.exists("Additional Salary", {"employee": i.employee, "salary_component": staff_loan_component.name, "payroll_date": new_check, "docstatus": 1, "amount": repayment_amount}): 
                        if not d.payment_reference:
                            # If it doesn't exist, create a new Additional Salary
                            new_additional_salary = frappe.new_doc("Additional Salary")
                            new_additional_salary.employee = i.employee
                            new_additional_salary.employee_name = i.employee_name
                            new_additional_salary.company = default_company
                            new_additional_salary.salary_component = staff_loan_component.name
                            new_additional_salary.amount = repayment_amount
                            new_additional_salary.payroll_date = doc.start_date
                            new_additional_salary.insert()
                            new_additional_salary.submit()
                            d.payment_reference = new_additional_salary.name
                            d.save()
@frappe.whitelist()
def do_cancel(doc, method):
    # for i in doc.employees:
    #     if frappe.db.exists("Additional Salary", {"employee": i.employee, "salary_component": "Staff Loan", "payroll_date": doc.start_date, "docstatus": 1}):
    #         add_salary = frappe.get_list("Additional Salary", filters={
    #                 "employee": i.employee,
    #                 "salary_component": "Staff Loan",
    #                 "payroll_date": doc.start_date,
    #                 "docstatus": 1
    #             }, fields={"name"})
    #         for add in add_salary:
    #             if frappe.db.exists("Custom Loan", {"applicant": i.employee, "status": "Disbursed"}):
    #                 custom_loan = frappe.get_list("Custom Loan", filters={
    #                         "applicant": i.employee, 
    #                         "status": "Disbursed"
    #                         },fields={"name"})
    #                 for loans in custom_loan:
    #                     custom_loann = frappe.get_doc("Custom Loan", loans)
    #                     for d in custom_loann.repayment_schedule:
    #                         if d.payment_reference == add:
    #                             d.payment_reference = ""
    #                             d.is_paid = 0
    #                             d.save()
    #             additional_salary = frappe.get_doc("Additional Salary", add)
    #             additional_salary.cancel()
    #             additional_salary.delete()
    pass

@frappe.whitelist()
def do_cancell(doc, method):
    emp = doc.employee
    if frappe.db.exists("Custom Loan", {"applicant": emp, "status": "Disbursed"}):
        custom_loan = frappe.get_list("Custom Loan", filters={
            "applicant": emp,
            "status": "Disbursed"
            },fields={"name"})
        for loans in custom_loan:
            custom_loann = frappe.get_doc("Custom Loan", loans)
            for d in custom_loann.repayment_schedule:
                if d.payment_reference == doc.name:
                    d.payment_reference = ""
                    d.is_paid = 0
                    d.save()

@frappe.whitelist()
def update_additional_salary(ref_name,amount,loan,payment_date,loan_amount,input_amount,input_date):
    from frappe.utils import flt
    from datetime import datetime,timedelta
    from dateutil.relativedelta import relativedelta
    custom_loan = frappe.get_doc("Custom Loan", loan)
    if flt(amount) > 0:
        for d in custom_loan.repayment_schedule:
            if d.payment_date == datetime.strptime(input_date, "%Y-%m-%d").date():
                ref_name = d.payment_reference
        doc = frappe.get_doc("Additional Salary", ref_name)
        doc.cancel()
        doc.reload()
        amendment = frappe.copy_doc(doc)
        amendment.docstatus = 0
        amendment.amended_from = doc.name
        amendment.amount = flt(amount) 
        amendment.save()
        amendment.submit()
        amendment.reload()
        # return amendment.name
        
        # custom_loan = frappe.get_doc("Custom Loan", loan)
        # for d in custom_loann.repayment_schedule:
        #     if d.payment_date == datetime.strptime(payment_date, "%Y-%m-%d").date():
        #         # frappe.throw("Payment Date " + str(d.payment_date) + " " + str(payment_date))
        #         d.total_payment = total_payment
        #         d.balance_loan_amount = balance_loan_amount
        #         d.payment_reference = amendment.name
        #         d.is_paid = 0
        #         # d.save()
        #         d.db_update()
        #         frappe.db.commit()

        loan_amount = custom_loan.loan_amount - custom_loan.total_amount_paid
        monthly_repayment_amount = custom_loan.monthly_repayment_amount
        loan_amount -= flt(input_amount)
        
        repayment_schedule = []
        payment_counter = 0
        
        while loan_amount > 0:
            payment = {}
            payment_date_obj = datetime.strptime(payment_date, "%Y-%m-%d")
            next_month = payment_date_obj + relativedelta(months=1)
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

        loan_amountt = custom_loan.loan_amount - custom_loan.total_amount_paid
        loan_amountt -= flt(input_amount)
		
        # payment_date_str = datetime.strftime(payment_date,"%Y-%m-%d")
        payment_dt = datetime.strptime(payment_date, "%Y-%m-%d")
        payment_dt = payment_dt.replace(day=1)
        custom_loan.append("repayment_schedule", {
			"payment_date": payment_dt.strftime("%Y-%m-%d"),
			"principal_amount": 0,
			"total_payment": flt(input_amount),
			"balance_loan_amount": loan_amountt,
			"is_paid": 0,
			"outsource": 0,
			"payment_reference": amendment.name

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
        return "pass"
    else:
        for d in custom_loan.repayment_schedule:
            if d.payment_reference == ref_name:
                d.payment_reference = ""
                d.is_paid = 0
                d.save()
                if d.save():
                    additional_salary = frappe.get_doc("Additional Salary", ref_name)
                    additional_salary.cancel()
                    # additional_salary.delete()
        return 1