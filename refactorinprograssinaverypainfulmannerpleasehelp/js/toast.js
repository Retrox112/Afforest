    export function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.innerText = message;
      
      if (isError) {
        toast.className = "fixed top-16 left-1/2 -translate-x-1/2 bg-rose-950 border border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 transform translate-y-0 opacity-100 transition-all duration-300 flex items-center gap-2";
      } else {
        toast.className = "fixed top-16 left-1/2 -translate-x-1/2 bg-navy-800 border border-forest-500 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 transform translate-y-0 opacity-100 transition-all duration-300 flex items-center gap-2";
      }

      setTimeout(() => {
        toast.classList.replace('translate-y-0', '-translate-y-20');
        toast.classList.replace('opacity-100', 'opacity-0');
      }, 3000);
    }