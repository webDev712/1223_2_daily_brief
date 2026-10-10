function sendEmailNewIssue(id, owner_name, timestamp, date, lead, dep, cat, severity, desc, status) {
  Logger.log('sendEmailNewIssue')
  let listSH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Lists');
  let emails = listSH.getRange('J2:K200').getValues().filter(el => el[0] && el[1]);
  let owner_obj = emails.filter(el => el[0] == owner_name)
  if (owner_obj) {
    Logger.log('new_row: ', id, owner_name, timestamp, date, lead, dep, cat, severity, desc, status)
    Logger.log('owner_obj: ', owner_obj)
    let owner_email = owner_obj[0][1];
    const htmlTable = `
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin-top: 15px;">
      <tr>
        <th style="width: max-content; ">ID</th>
        <td>${id || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Timestamp</th>
        <td>${timestamp || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Production Date</th>
        <td>${date || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Lead Name</th>
        <td>${lead || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Departments</th>
        <td>${dep || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Category</th>
        <td>${cat || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Severity</th>
        <td>${severity || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Owner</th>
        <td>${owner_name || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Description</th>
        <td>${desc || '-'}</td>
      </tr>
      <tr>
        <th style="width: max-content; ">Status</th>
        <td>${status || '-'}</td>
      </tr>
    </table>
  `;
    MailApp.sendEmail({
      to: owner_email,
      subject: "Production Dashboard - New Action!",
      htmlBody: `Hello, ${owner_name}! There is new Action in Action Tracker for you!` + htmlTable,
    });
  }
}
