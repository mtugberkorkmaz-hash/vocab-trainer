/* Stack-based screen router.
 * Fixes the retro app's broken back button: instead of always jumping to
 * the main menu, back() always returns to the *previous* screen, and stays
 * in sync with the hardware/gesture back action via popstate. */
const Router = {
  stack: [],

  init() {
    window.addEventListener('popstate', (e) => this._onPop(e));
  },

  reset(screen, params) {
    this.stack = [{ screen, params: params || {} }];
    history.replaceState({ depth: 1 }, '', '#' + screen);
    this._render();
  },

  push(screen, params) {
    this.stack.push({ screen, params: params || {} });
    history.pushState({ depth: this.stack.length }, '', '#' + screen);
    this._render();
  },

  replace(screen, params) {
    this.stack[this.stack.length - 1] = { screen, params: params || {} };
    history.replaceState({ depth: this.stack.length }, '', '#' + screen);
    this._render();
  },

  back() {
    if (this.stack.length > 1) history.back();
  },

  canGoBack() {
    return this.stack.length > 1;
  },

  current() {
    return this.stack[this.stack.length - 1];
  },

  rerender() {
    this._render();
  },

  _onPop(e) {
    const depth = (e.state && e.state.depth) || 1;
    if (depth < this.stack.length) {
      this.stack.length = depth;
      this._render();
    } else if (this.stack.length === 0) {
      this.reset('menu');
    }
  },

  _render() {
    Screens.render(this.current(), this.canGoBack());
  },
};
