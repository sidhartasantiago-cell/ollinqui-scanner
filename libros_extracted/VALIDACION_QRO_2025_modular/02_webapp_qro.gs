// Publica la interfaz HTML de la consola operativa.
function doGet(e) {
  let role = "irvin"; // default
  if (e && e.parameter && e.parameter.role) {
    role = e.parameter.role.toLowerCase();
  } else {
    try {
      const email = Session.getActiveUser().getEmail().toLowerCase();
      if (email.indexOf("daniel") !== -1 || email.indexOf("jesus") !== -1 || email.indexOf("oscher") !== -1) {
        role = "daniel";
      }
    } catch(err) {
      // Ignorar si no está autenticado o no se puede obtener el correo
    }
  }
 
  const template = HtmlService.createTemplateFromFile('Index');
  template.role = role;
 
  return template.evaluate()
    .setTitle('Tlachialoni QRO - Consola de Operación v70.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
