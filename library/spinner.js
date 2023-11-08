const ora = require("ora")

function startSpinner(text) {
  const spinner = ora({
    text: text,
    spinner: "dots",
    color: "green",
  }).start()

  return spinner
}

function stopSpinner(spinner, text, isSuccess = true) {
  if (isSuccess) {
    spinner.succeed(text)
  } else {
    spinner.fail(text)
  }
  spinner.stop()
}

function updateSpinnerText(spinner, text) {
  spinner.text = text
}

module.exports = {
  startSpinner,
  stopSpinner,
  updateSpinnerText,
}
