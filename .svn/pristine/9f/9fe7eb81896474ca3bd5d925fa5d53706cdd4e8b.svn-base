package com.future.my.service;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.future.my.dao.ITempDAO;
import com.future.my.vo.TempVO;

@Service
public class TempService {

	@Autowired
	ITempDAO dao;
	
	public ArrayList<TempVO> getCountryTemp(){
		return dao.getCountryTemp();
	};
	
	public ArrayList<TempVO> getCityTemp(TempVO vo){
		return dao.getCityTemp(vo);
	};
}
