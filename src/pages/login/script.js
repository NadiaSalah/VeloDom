export function init({ state }) {
  state.credentials = {
    username: "emilys",
    password: "emilyspass"
  };
  state.loginResult = null;
  state.loginLoading = false;
  state.loginError = "";
}
