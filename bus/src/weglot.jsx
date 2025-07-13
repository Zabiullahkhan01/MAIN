import { useEffect } from "react";

function WeglotRefresh() {
  useEffect(() => {
    if (!window.Weglot) return;

    const observer = new MutationObserver(() => {
      // Call the refresh function or reinitialize as needed
      window.Weglot.initialize({
        api_key: "wg_1c5aa01b0ed0d8e3cbe15bcfd9bf94023",
        dynamic: true,
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}

export default WeglotRefresh;
