function loop(i = 0) {
  try {
    console.log(i);
    return loop(i + 1);
  } catch (e) {
    console.error(e.message);
    console.log("in catch", i);
  }
}

loop();
