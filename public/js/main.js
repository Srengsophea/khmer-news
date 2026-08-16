document.addEventListener('DOMContentLoaded', function() {
  var switcher = document.getElementById('langSwitcher');
  if (switcher) {
    switcher.addEventListener('change', function() {
      var lang = this.value;
      var currentPath = window.location.pathname;
      window.location.href = '/change-lang/' + lang;
    });
  }
});
