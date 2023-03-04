import xml.etree.ElementTree as ET
import ftplib

# Define the loan data
loan_data = {
    "borrower": "John Doe",
    "amount": "100000",
    "interest_rate": "5.0",
    "term": "30 years"
}

# Create the root element
root = ET.Element("loan")

# Add child elements with loan data
for key, value in loan_data.items():
    child = ET.SubElement(root, key)
    child.text = value

# Create the XML tree and write it to a file
tree = ET.ElementTree(root)
tree.write("loan.xml")

# Connect to the FTP server and upload the file
ftp = ftplib.FTP("rathodtz.com")
ftp.login("u76190068", "Rathod@786")
with open("loan.xml", "rb") as f:
    ftp.storbinary("STOR loan.xml", f)
ftp.quit()